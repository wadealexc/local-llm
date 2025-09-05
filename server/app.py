from flask import Flask

app = Flask(__name__)

@app.get("/")
def bootstrap():
    return "curl -sS oak.lan:8000/start | bash"

@app.get("/start")
def start():
    return "echo hi"

if __name__ == "__main__":
    # pip install -U flask requests
    app.run(host="0.0.0.0", port=8000)