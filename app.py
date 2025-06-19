from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_pymongo import PyMongo
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# MongoDB configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/habit_tracker")
mongo = PyMongo(app)

# Routes
@app.route('/')
def index():
    # Get current greeting based on time
    current_hour = datetime.now().hour
    if 5 <= current_hour < 12:
        greeting = "Good morning"
    elif 12 <= current_hour < 17:
        greeting = "Good afternoon"
    elif 17 <= current_hour < 21:
        greeting = "Good evening"
    else:
        greeting = "Good night"
    
    # Get quotes (you can expand this list)
    quotes = [
        "The path towards success begins with the first step that you take today. - Soumyadip",
        "Believe in yourself. You can do it!",
        "Push yourself, because no one else is going to do it for you.",
        "Great things never come from comfort zones.",
        "Dream it. Wish it. Do it.",
        "Success doesn't just find you. You have to go out and get it."
    ]
    
    # Get today's date
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get tasks for today
    tasks = list(mongo.db.tasks.find({"date": today}).sort("time", 1))
    
    # Get all unique dates with tasks for calendar
    all_dates = mongo.db.tasks.distinct("date")
    
    # Calculate stats
    total_tasks = mongo.db.tasks.count_documents({"date": today})
    completed_tasks = mongo.db.tasks.count_documents({"date": today, "completed": True})
    
    return render_template('index.html', 
                         greeting=greeting,
                         name="Soumyadip",
                         quotes=quotes,
                         tasks=tasks,
                         today=today,
                         all_dates=all_dates,
                         total_tasks=total_tasks,
                         completed_tasks=completed_tasks)

@app.route('/add_task', methods=['POST'])
def add_task():
    task_data = {
        "title": request.form.get('title'),
        "description": request.form.get('description'),
        "date": request.form.get('date'),
        "time": request.form.get('time'),
        "completed": False,
        "created_at": datetime.now()
    }
    mongo.db.tasks.insert_one(task_data)
    return redirect(url_for('index'))

@app.route('/update_task/<task_id>', methods=['POST'])
def update_task(task_id):
    if request.form.get('action') == 'toggle':
        task = mongo.db.tasks.find_one({"_id": ObjectId(task_id)})
        mongo.db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"completed": not task["completed"]}}
        )
    elif request.form.get('action') == 'delete':
        mongo.db.tasks.delete_one({"_id": ObjectId(task_id)})
    return redirect(url_for('index'))

@app.route('/get_tasks_by_date/<date>')
def get_tasks_by_date(date):
    tasks = list(mongo.db.tasks.find({"date": date}).sort("time", 1))
    # Convert ObjectId to string for JSON serialization
    for task in tasks:
        task['_id'] = str(task['_id'])
    return jsonify(tasks)

@app.route('/get_stats')
def get_stats():
    # Daily stats
    today = datetime.now().strftime("%Y-%m-%d")
    daily_total = mongo.db.tasks.count_documents({"date": today})
    daily_completed = mongo.db.tasks.count_documents({"date": today, "completed": True})
    
    # Weekly stats
    week_start = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime("%Y-%m-%d")
    weekly_total = mongo.db.tasks.count_documents({"date": {"$gte": week_start}})
    weekly_completed = mongo.db.tasks.count_documents({"date": {"$gte": week_start}, "completed": True})
    
    # Monthly stats
    month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    monthly_total = mongo.db.tasks.count_documents({"date": {"$gte": month_start}})
    monthly_completed = mongo.db.tasks.count_documents({"date": {"$gte": month_start}, "completed": True})
    
    return jsonify({
        "daily": {"total": daily_total, "completed": daily_completed},
        "weekly": {"total": weekly_total, "completed": weekly_completed},
        "monthly": {"total": monthly_total, "completed": monthly_completed}
    })

if __name__ == '__main__':
    app.run(debug=True)