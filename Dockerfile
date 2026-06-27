FROM python:3.11-slim

WORKDIR /app

COPY python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY python/ .

EXPOSE 7860

CMD ["uvicorn", "addon:app", "--host", "0.0.0.0", "--port", "7860"]
