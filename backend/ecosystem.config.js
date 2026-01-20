module.exports = {
    apps: [
        {
            name: "praman-backend",
            script: "app.py",
            interpreter: "./venv/bin/python",
            env: {
                "FLASK_RUN_PORT": 5000,
                "PYTHONUNBUFFERED": "1"
            }
        }
    ]
};
