from datetime import date

import yaml

from app.parsers.structured import parse_document


class YamlParser:
    @staticmethod
    def parse(text):
        try:
            if any(isinstance(token, yaml.tokens.AliasToken) for token in yaml.scan(text)):
                return (
                    None,
                    [],
                    ["YAML aliases are not supported. Expand aliases before importing."],
                )
            data = yaml.safe_load(text)
        except (yaml.YAMLError, RecursionError, ValueError) as exc:
            return None, [], [f"Invalid YAML syntax: {exc}"]

        def normalize(value, key=""):
            if isinstance(value, dict):
                return {k: normalize(v, str(k)) for k, v in value.items()}
            if isinstance(value, list):
                return [normalize(v) for v in value]
            if key.endswith("Date") and isinstance(value, date):
                return value.isoformat()
            if key.endswith("Date") and type(value) is int and 1000 <= value <= 9999:
                return str(value)
            return value

        try:
            return parse_document(normalize(data))
        except RecursionError:
            return None, [], ["Document nesting exceeds the supported depth."]
