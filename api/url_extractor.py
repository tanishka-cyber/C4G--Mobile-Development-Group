import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


def extract_text_from_url(url: str):
    try:
        response = requests.get(
            url,
            timeout=10,
            headers={
                "User-Agent": "Mozilla/5.0"
            }
        )

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        title = soup.title.text.strip() if soup.title else "Unknown"

        for element in soup(
            ["script", "style", "nav", "footer", "header"]
        ):
            element.decompose()

        text = soup.get_text(
            separator="\n"
        )

        cleaned_text = "\n".join(
            line.strip()
            for line in text.splitlines()
            if line.strip()
        )

        words = cleaned_text.split()

        word_count = len(words)

        reading_time = max(1, round(word_count / 250))

        company = urlparse(url).netloc.replace("www.", "")

        return {
            "text": cleaned_text,
            "title": title,
            "company": company,
            "word_count": word_count,
            "reading_time": reading_time
        }

    except Exception:
        return None