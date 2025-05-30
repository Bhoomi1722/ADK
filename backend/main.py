import os
import asyncio
import uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools.function_tool import FunctionTool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import requests
from datetime import datetime
from mcp.client.stdio import StdioClient
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Environment setup
os.environ["GOOGLE_API_KEY"] = "your-google-api-key"
os.environ["OPENWEATHER_API_KEY"] = "your-openweather-api-key"
os.environ["GCP_PROJECT"] = "your-gcp-project"
os.environ["GCP_LOCATION"] = "us-central1"
APP_NAME = os.getenv("APP_NAME", "travel_itinerary_app")

# Pydantic models
class TravelRequest(BaseModel):
    destination: str
    start_date: str
    end_date: str
    budget: float
    interests: list[str]

class ItineraryResponse(BaseModel):
    destination: str
    weather: dict
    activities: list[dict]
    timestamp: str

# Weather Tool (Direct Fallback)
def get_weather(destination: str) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {"status": "error", "error_message": "Missing OpenWeatherMap API key"}
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={destination}&units=metric&appid={api_key}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return {
            "status": "success",
            "destination": destination,
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "condition": data["weather"][0]["description"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        return {"status": "error", "error_message": f"Failed to fetch weather: {str(e)}"}

# Activity Tool (Mock implementation)
def suggest_activities(destination: str, weather: dict, interests: list[str], budget: float) -> list[dict]:
    try:
        activities = []
        if "museums" in interests and budget >= 20:
            activities.append({"name": f"Visit {destination} Museum", "cost": 20, "suitable_weather": "any"})
        if "hiking" in interests and weather.get("condition", "").lower() not in ["rain", "storm"] and budget >= 10:
            activities.append({"name": f"Hiking in {destination} Park", "cost": 10, "suitable_weather": "clear"})
        if "food" in interests and budget >= 30:
            activities.append({"name": f"Local Cuisine Tour in {destination}", "cost": 30, "suitable_weather": "any"})
        return activities if activities else [{"name": "Relax at hotel", "cost": 0, "suitable_weather": "any"}]
    except Exception as e:
        return [{"status": "error", "error_message": f"Failed to suggest activities: {str(e)}"}]

# Global MCP Client
mcp_client = None

async def start_mcp_client():
    global mcp_client
    try:
        api_script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api.py")
        mcp_client = StdioClient(
            command="python",
            args=[api_script_path, "--mode", "mcp"]
        )
        await mcp_client.start()
        logger.info("MCP client started successfully")
    except Exception as e:
        logger.error(f"Failed to start MCP client: {str(e)}")
        mcp_client = None

# Agents
async def initialize_agents():
    weather_tool = FunctionTool(get_weather) if mcp_client is None else FunctionTool(mcp_client.call)
    weather_agent = LlmAgent(
        name="weather_agent",
        model="gemini-2.5-pro",
        description="Fetches weather data for the travel destination.",
        instruction="Fetch weather data for the specified destination using the provided tool.",
        tools=[weather_tool]
    )

    activity_agent = LlmAgent(
        name="activity_agent",
        model="gemini-2.5-pro",
        description="Suggests activities based on weather, interests, and budget.",
        instruction="Suggest activities for the destination based on weather, user interests, and budget.",
        tools=[FunctionTool(suggest_activities)]
    )

    orchestrator_agent = SequentialAgent(
        name="orchestrator_agent",
        sub_agents=[weather_agent, activity_agent],
        description="Coordinates weather data and activity suggestions for a travel itinerary."
    )
    
    return orchestrator_agent

# Startup Event
@app.on_event("startup")
async def startup_event():
    await start_mcp_client()

# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    global mcp_client
    if mcp_client:
        await mcp_client.stop()
        logger.info("MCP client stopped")

# HTTP Endpoint
@app.post("/api/plan-itinerary", response_model=ItineraryResponse)
async def plan_itinerary(request: TravelRequest):
    try:
        # Initialize session service
        session_service = InMemorySessionService()
        user_id = f"user_{uuid.uuid4()}"
        session_id = f"session_{uuid.uuid4()}"
        
        # Create session and verify
        session = session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id
        )
        logger.info(f"Created session: user_id={user_id}, session_id={session_id}")

        # Initialize agents
        orchestrator_agent = await initialize_agents()
        
        # Initialize runner
        runner = Runner(
            agent=orchestrator_agent,
            app_name=APP_NAME,
            session_service=session_service
        )

        # Prepare query
        query = f"Plan a travel itinerary for {request.destination} from {request.start_date} to {request.end_date} with interests {', '.join(request.interests)} and budget ${request.budget}."
        content = types.Content(
            role="user",
            parts=[types.Part(text=query)]
        )

        # Run agent with session validation
        result = None
        try:
            for event in runner.run(
                user_id=user_id,
                session_id=session_id,
                new_message=content
            ):
                if event.is_final_response():
                    result = event.content.parts[0].text
                    break
        except ValueError as ve:
            logger.error(f"Session error during runner.run: {str(ve)}")
            raise HTTPException(status_code=500, detail="Session not found, please try again")

        # Fallback direct calls for reliability
        weather_data = get_weather(request.destination)
        activities = suggest_activities(request.destination, weather_data, request.interests, request.budget)

        return ItineraryResponse(
            destination=request.destination,
            weather=weather_data,
            activities=activities,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
    except Exception as e:
        logger.error(f"Error planning itinerary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)