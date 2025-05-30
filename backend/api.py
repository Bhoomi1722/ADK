from mcp import Server
from mcp.servers.stdio import StdioServer

def get_weather(location: str) -> dict:
    import os
    import requests
    from datetime import datetime
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

def main():
    server = StdioServer()
    server.register_function(get_weather)
    server.run()

if __name__ == "__main__":
    main()