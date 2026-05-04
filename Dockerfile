# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose the port (Cloud Run will inject its own PORT env var)
EXPOSE 8080

# Command to run the application
# We use the full path to main.py
CMD ["python", "backend/main.py"]
