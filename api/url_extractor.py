import requests
from bs4 import BeautifulSoup

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