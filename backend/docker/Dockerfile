FROM python:3.10-slim

WORKDIR /app

# Install compilers
RUN apt-get update && apt-get install -y g++ gcc

# Create user
RUN useradd -m appuser
RUN chown -R appuser:appuser /app
USER appuser

# Keep container alive properly (VERY IMPORTANT)
CMD ["tail", "-f", "/dev/null"]