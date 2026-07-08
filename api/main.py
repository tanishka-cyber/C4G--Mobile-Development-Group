from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import groq;
import os
from pydantic import BaseModel
import json
import copy
from pypdf import PdfReader
import io
import requests
from bs4 import BeautifulSoup

class URLRequest(BaseModel):
    url: str

app = FastAPI()

client = Groq(
    api_key=os.environ.get("SIMPLELENS_GROQ_API_KEY")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://pegnhhobmmkkhlndochgnjnbeneoimjk",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
data = {
    "model": "openai/gpt-oss-20b",
    "messages": [
        {
            "role": "system",
            "content": "You will be given a document to analyize for user privacy, security, best practices, user data collection, selling of user data, tracking, legal compliance, promises, amount of jargon, etc."
        }
    ],
    "temperature": 0,
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "document_info",
            "description": "Analysis Information of the document",
            "schema": {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "title": "Document Analysis",
                "type": "object",
                "properties": {
                    "score": {
                        "description": "The score from 0-100 of the document, given user privacy, security, best practices, user data collection, selling of user data, tracking, legal compliance, promises, amount of jargon, etc. Do not be afraid to give a low score, but also do not be afraid to give a high score if it is really really good.",
                        "type": "integer"
                    },
                    "score_summary": {
                        "description": "Simple, succinct reasoning for the given score",
                        "type": "string"
                    },
                    "key_points": {
                        "description": "3-5 key things the user needs to know about the document",
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "summary": {
                        "description": "Summary of the document",
                        "type": "string"
                    }
                }
            }
        }
    }
}

@app.get("/")
def apiInfo():
    return {"active": True}

def extract_text_from_url(url: str):
    try:
        response = requests.get(
            url,
            timeout = 10,
            headers={
                "User-Agent":"Mozilla/5.0"
            }
        )

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )
        # Remove unnecessary webpage elements
        for element in soup(
            ["script", "style", "nav", "footer"]
        ):
            element.decompose()

        text = soup.get_text(
            separator="\n"
        )
        # Remove empty lines and clean text
        cleaned_text = "\n".join(
            line.strip()
            for line in text.splitlines()
            if line.strip()
        )

        return cleaned_text
    
    except Exception:
        return None


def get_color(score: int):
    score = max(0, min(100, score))

    stops = [
        (0,   (139,   0,   0)),
        (25,  (255,   0,   0)),
        (50,  (255, 255,   0)),
        (75,  (  0, 255,   0)),
        (100, (  0, 100,   0)),
    ]

    for i in range(len(stops) - 1):
        p1, c1 = stops[i]
        p2, c2 = stops[i + 1]

        if p1 <= score <= p2:
            t = (score - p1) / (p2 - p1)

            r = round(c1[0] + (c2[0] - c1[0]) * t)
            g = round(c1[1] + (c2[1] - c1[1]) * t)
            b = round(c1[2] + (c2[2] - c1[2]) * t)

            return f"#{r:02X}{g:02X}{b:02X}"

    return "#000000"

def get_short_score(score: int):
    if (score < 10):
        return "Abysmal"
    if (score < 20):
        return "Terrible"
    if (score < 30):
        return "Poor"
    if (score < 40):
        return "Bad"
    if (score < 50):
        return "Mediocre"
    if (score < 60):
        return "Fair"
    if (score < 70):
        return "Adequate"
    if (score < 80):
        return "Good"
    if (score < 90):
        return "Great"
    if (score < 95):
        return "Excellent"
    return "Exceptional"

@app.post("/url/")
def read_item(request: URLRequest):
    try:
        messages = copy.deepcopy(data['messages'])
        website_text = extract_text_from_url(request.url)

        if not website_text:
            return{
                "error_message": "Could not read webpage",
                "success":False
            }

        messages.append({
            "role": "user",
            "content": "Document contents: " + website_text
        })

        response = client.chat.completions.create(
            model=data['model'],
            temperature=data['temperature'],
            response_format=data['response_format'],
            messages=messages
        )
        result = json.loads(response.choices[0].message.content or "{}")
        return {
            "score": result['score'],
            "key_points": result['key_points'],
            "summary": result['summary'],
            "type": "url",
            "short_score": get_short_score(result['score']),
            "long_score": result['score_summary'],
            "score_color": get_color(result['score']),
            "success": True
        }
    except groq.APIStatusError as e:
        return {
            "error_message": f"Failed to query AI (status code: {e.status_code})<br>{e.response}",
            "success": False
        }
    except groq.APIConnectionError as e:
        return {
            "error_message": f"Network connection failed",
            "success": False
        }
    except groq.APITimeoutError as e:
        return {
            "error_message": f"AI request failed",
            "success": False
        }
    except Exception as e:
        return {
            "error_message": f"${e}",
            "success": False
        }

@app.post("/document/")
async def read_item(file: UploadFile = File(...)):
    content = await file.read()
    if file.content_type == "application/pdf":
        pdf = PdfReader(io.BytesIO(content))

        text = ""

        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    else:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            return {
                "error_message": "File must be text-based",
                "success": False
            }
    try:
        messages = copy.deepcopy(data['messages'])
        messages.append({
            "role": "user",
            "content": "Document contents: " + text
        })
        response = client.chat.completions.create(
            model=data['model'],
            temperature=data['temperature'],
            response_format=data['response_format'],
            messages=messages
        )
        result = json.loads(response.choices[0].message.content or "{}")
        return {
            "score": result['score'],
            "key_points": result['key_points'],
            "summary": result['summary'],
            "type": "url",
            "short_score": get_short_score(result['score']),
            "long_score": result['score_summary'],
            "score_color": get_color(result['score']),
            "success": True
        }
    except groq.APIStatusError as e:
        return {
            "error_message": f"Failed to query AI (status code: {e.status_code})<br>{e.response}",
            "success": False
        }
    except groq.APIConnectionError as e:
        return {
            "error_message": f"Network connection failed",
            "success": False
        }
    except groq.APITimeoutError as e:
        return {
            "error_message": f"AI request failed",
            "success": False
        }
    except Exception as e:
        return {
            "error_message": f"${e}",
            "success": False
        }

@app.post("/chat/")
def read_item(document: str):
    return {}