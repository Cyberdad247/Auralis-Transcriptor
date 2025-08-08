# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY src/ /app/src/

# Set the python path
ENV PYTHONPATH "${PYTHONPATH}:/app"

# Set the entrypoint for the container
ENTRYPOINT ["python", "src/main.py"]
