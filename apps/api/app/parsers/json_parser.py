import json

from app.parsers.structured import parse_document


class JsonParser:
    @staticmethod
    def parse(text):
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, RecursionError, ValueError) as exc:
            return None, [], [f"Invalid JSON syntax: {exc}"]
        return parse_document(data)
