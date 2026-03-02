# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file first to leverage Docker cache
# (This looks for requirements.txt in the same folder as the Dockerfile)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the 'app' directory into the container
COPY ./app ./app

# Expose port 8000 for FastAPI
EXPOSE 8000

# Run the application
# We use app.main:app because main.py is inside the app folder
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]