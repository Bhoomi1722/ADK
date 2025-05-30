import os
import asyncio
import uuid
import pandas as pd
import yfinance as yf
from sklearn.linear_model import LinearRegression
from fastapi import FastAPI, WebSocket
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools.function_tool import FunctionTool
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import requests
from datetime import datetime, timedelta
import json
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
APP_NAME = os.getenv("APP_NAME", "stock_weather_app")

# Weather Tool (Direct Fallback)
def get_weather(location: str) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {"status": "error", "error_message": "Missing OpenWeatherMap API key"}
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&units=metric&appid={api_key}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return {
            "status": "success",
            "location": location,
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "weather_condition": data["weather"][0]["description"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        return {"status": "error", "error_message": f"Failed to fetch weather: {str(e)}"}

# Stock Prediction Tool
def predict_stock_price(ticker: str, weather_data: dict) -> dict:
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        stock_data = yf.download(ticker, start=start_date, end=end_date, progress=False)
        if stock_data.empty:
            return {"status": "error", "error_message": f"No stock data for {ticker}"}
        features = pd.DataFrame({
            "close_price": stock_data["Close"],
            "temperature": weather_data.get("temperature", 0),
            "humidity": weather_data.get("humidity", 0)
        })
        model = LinearRegression()
        X = features[["temperature", "humidity"]].iloc[:-1]
        y = features["close_price"].shift(-1).iloc[:-1]
        model.fit(X, y)
        latest_features = features[["temperature", "humidity"]].iloc[-1:]
        predicted_price = model.predict(latest_features)[0]
        return {
            "status": "success",
            "ticker": ticker,
            "predicted_price": round(predicted_price, 2),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        return {"status": "error", "error_message": f"Prediction failed: {str(e)}"}

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
        description="Fetches real-time weather data for a given location.",
        instruction="Fetch weather data for the specified location using the provided tool.",
        tools=[weather_tool]
    )

    stock_prediction_agent = LlmAgent(
        name="stock_prediction_agent",
        model="gemini-2.5-pro",
        description="Predicts stock prices using historical data and weather data.",
        instruction="Use weather data and historical stock data to predict the stock price for the given ticker.",
        tools=[FunctionTool(predict_stock_price)]
    )

    orchestrator_agent = SequentialAgent(
        name="orchestrator_agent",
        sub_agents=[weather_agent, stock_prediction_agent],
        description="Coordinates weather data retrieval and stock price prediction."
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

# WebSocket Endpoint with Dynamic Session
@app.websocket("/ws/predict")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")
    try:
        user_id = f"user_{uuid.uuid4()}"
        session_id = f"session_{uuid.uuid4()}"
        session_service = InMemorySessionService()
        session = session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id
        )
        orchestrator_agent = await initialize_agents()
        runner = Runner(
            agent=orchestrator_agent,
            app_name=APP_NAME,
            session_service=session_service
        )
        while True:
            try:
                data = await websocket.receive_json()
                ticker = data.get("ticker", "ADM")
                location = data.get("location", "Chicago")
                query = f"Predict the stock price for {ticker} using weather data from {location}."
                content = types.Content(
                    role="user",
                    parts=[types.Part(text=query)]
                )
                result = None
                for event in runner.run(
                    user_id=user_id,
                    session_id=session_id,
                    new_message=content
                ):
                    if event.is_final_response():
                        result = event.content.parts[0].text
                        break
                weather_data = get_weather(location)  # Fallback to direct call
                prediction = predict_stock_price(ticker, weather_data)
                response = {
                    "weather": weather_data,
                    "prediction": prediction,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                await websocket.send_json(response)
                await asyncio.sleep(60)  # Update every minute
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                await websocket.send_json({"status": "error", "error_message": str(e)})
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
        await websocket.send_json({"status": "error", "error_message": str(e)})
    finally:
        await websocket.close()
        logger.info("WebSocket connection closed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)