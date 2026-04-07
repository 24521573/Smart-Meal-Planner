import sqlite3
import json
import math
import calendar
from datetime import datetime, timedelta, timezone # Thêm timezone ở đây
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "meal_planner.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def setup_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE, password TEXT, name TEXT,
            monthly_budget REAL, remaining_monthly_budget REAL,
            daily_budget REAL, remaining_budget REAL,
            height REAL, weight REAL, age INTEGER, gender TEXT,
            activity_level REAL, allergies TEXT,
            tdee REAL, remaining_calories REAL,
            last_login_date TEXT, streak INTEGER DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Foods (
            food_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE, price REAL, image_url TEXT, map_url TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS MealHistory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, food_id INTEGER, price_at_time REAL, eaten_at TEXT,
            rating INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES Users(user_id),
            FOREIGN KEY(food_id) REFERENCES Foods(food_id)
        )
    ''')
    conn.commit()
    conn.close()

setup_db()

with open("mock_data.json", "r", encoding="utf-8") as file:
    foods_data = json.load(file)

class RegisterRequest(BaseModel):
    username: str; password: str; name: str; monthly_budget: float
    height: float; weight: float; age: int; gender: str
    activity_level: float; allergies: str

class UserRequest(BaseModel):
    user_id: int; location: str; filter_type: str = "dinh_duong"

class ConfirmRequest(BaseModel):
    user_id: int; food_name: str; price: float; calories: float
    image_url: str = ""; map_url: str = ""

class RateRequest(BaseModel):
    history_id: int; rating: int

class TopUpRequest(BaseModel):
    user_id: int; amount: float

# HÀM MỚI: Luôn lấy giờ Việt Nam (UTC+7) bất kể server đặt ở đâu
def get_vn_now():
    return datetime.now(timezone(timedelta(hours=7)))

def check_and_reset_daily_stats(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("SELECT * FROM Users WHERE user_id = ?", (user_id,)).fetchone()
    
    if user:
        now = get_vn_now() # Dùng giờ VN
        current_date_str = now.strftime("%Y-%m-%d")
        last_login_str = user['last_login_date']
        
        if last_login_str != current_date_str:
            last_login_date = datetime.strptime(last_login_str, "%Y-%m-%d")
            delta_days = (now.date() - last_login_date.date()).days
            new_streak = user['streak'] + 1 if delta_days == 1 else 1
            
            if last_login_date.month != now.month or last_login_date.year != now.year:
                remaining_monthly = user['monthly_budget']
            else:
                remaining_monthly = user['remaining_monthly_budget']
                
            days_in_month = calendar.monthrange(now.year, now.month)[1]
            remaining_days_in_month = days_in_month - now.day + 1
            
            if remaining_days_in_month > 0:
                new_daily_budget = remaining_monthly / remaining_days_in_month
            else:
                new_daily_budget = remaining_monthly

            cursor.execute('''
                UPDATE Users 
                SET remaining_monthly_budget = ?, daily_budget = ?, remaining_budget = ?, 
                    remaining_calories = tdee, last_login_date = ?, streak = ? 
                WHERE user_id = ?
            ''', (remaining_monthly, new_daily_budget, new_daily_budget, current_date_str, new_streak, user_id))
            conn.commit()
            user = cursor.execute("SELECT * FROM Users WHERE user_id = ?", (user_id,)).fetchone()
            
    conn.close()
    return dict(user) if user else None

def calculate_cosine_similarity(v1: list, v2: list) -> float:
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0: return 0.0
    return dot_product / (norm_v1 * norm_v2)

@app.post("/register")
def register_user(req: RegisterRequest):
    if req.gender == 'Nam': bmr = (10 * req.weight) + (6.25 * req.height) - (5 * req.age) + 5
    else: bmr = (10 * req.weight) + (6.25 * req.height) - (5 * req.age) - 161
    tdee = bmr * req.activity_level
    
    now = get_vn_now() # Dùng giờ VN
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    remaining_days = days_in_month - now.day + 1
    
    initial_daily_budget = req.monthly_budget / remaining_days if remaining_days > 0 else req.monthly_budget
    current_date = now.strftime("%Y-%m-%d")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO Users (username, password, name, monthly_budget, remaining_monthly_budget, daily_budget, remaining_budget,
                               height, weight, age, gender, activity_level, allergies, tdee, remaining_calories, last_login_date, streak)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (req.username, req.password, req.name, req.monthly_budget, req.monthly_budget, initial_daily_budget, initial_daily_budget,
             req.height, req.weight, req.age, req.gender, req.activity_level,
             req.allergies.lower(), tdee, tdee, current_date, 1))
        conn.commit()
        return {"message": "Đăng ký thành công", "tdee": tdee}
    except sqlite3.IntegrityError: raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
    finally: conn.close()

@app.post("/login")
def login_user(req: dict):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM Users WHERE username = ? AND password = ?", (req['username'], req['password'])).fetchone()
    conn.close()
    if not user: raise HTTPException(status_code=401, detail="Sai tài khoản")
    return check_and_reset_daily_stats(user['user_id'])

@app.post("/topup")
def topup_budget(req: TopUpRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user = cursor.execute("SELECT remaining_monthly_budget, daily_budget, remaining_budget FROM Users WHERE user_id = ?", (req.user_id,)).fetchone()
        if not user: raise HTTPException(status_code=404, detail="User không tồn tại")
        
        if user['remaining_monthly_budget'] < req.amount:
            raise HTTPException(status_code=400, detail="Quỹ tháng không đủ để ứng thêm!")
            
        new_monthly = user['remaining_monthly_budget'] - req.amount
        new_daily = user['daily_budget'] + req.amount
        new_today_budget = user['remaining_budget'] + req.amount
        
        cursor.execute('''
            UPDATE Users 
            SET remaining_monthly_budget = ?, daily_budget = ?, remaining_budget = ? 
            WHERE user_id = ?
        ''', (new_monthly, new_daily, new_today_budget, req.user_id))
        conn.commit()
        
        return {"new_budget": new_today_budget, "message": "Ứng tiền thành công"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@app.post("/rate")
def rate_meal(req: RateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE MealHistory SET rating = ? WHERE id = ?", (req.rating, req.history_id))
        conn.commit()
        return {"message": "Đã lưu đánh giá"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@app.post("/recommend")
def recommend_meals(request: UserRequest):
    user = check_and_reset_daily_stats(request.user_id)
    conn = get_db_connection()
    history = conn.execute('''SELECT f.name, mh.rating FROM MealHistory mh JOIN Foods f ON mh.food_id = f.food_id WHERE mh.user_id = ?''', (request.user_id,)).fetchall()
    conn.close()
    user_allergies = [a.strip() for a in user['allergies'].split(',')] if user['allergies'] else []
    
    # Đã sửa lại lỗi Căn tin: Lấy giờ VN và check mở cửa từ 5h đến 15h59 (5 <= hour < 16)
    current_hour = get_vn_now().hour 
    is_canteen_open = 5 <= current_hour < 16
    
    available_foods = []
    for food in foods_data:
        if request.location not in food["location"]: continue
        food_allergens = food.get("allergens", "").lower()
        if any(allergy in food_allergens for allergy in user_allergies if allergy): continue
        food["is_closed"] = True if "căn tin uit" in food["restaurant_name"].lower() and not is_canteen_open else False
        available_foods.append(food)
        
    if history:
        sum_weights = 0
        sum_calories = 0; sum_pro = 0; sum_carb = 0; sum_fat = 0
        for h in history:
            food_info = next((item for item in foods_data if item["name"] == h['name']), None)
            if food_info:
                weight = h['rating'] if h['rating'] > 0 else 3
                sum_weights += weight
                sum_calories += food_info["calories"] * weight
                sum_pro += food_info["protein_g"] * weight
                sum_carb += food_info["carb_g"] * weight
                sum_fat += food_info["fat_g"] * weight
        if sum_weights > 0:
            user_profile_vector = [sum_calories / sum_weights, sum_pro / sum_weights, sum_carb / sum_weights, sum_fat / sum_weights]
            for f in available_foods:
                item_vector = [f["calories"], f["protein_g"], f["carb_g"], f["fat_g"]]
                f["similarity_score"] = calculate_cosine_similarity(user_profile_vector, item_vector)
                
    if request.filter_type == "gia_re":
        available_foods.sort(key=lambda x: (x.get("is_closed", False), x["price"]))
    else:
        if history and sum_weights > 0: available_foods.sort(key=lambda x: (x.get("is_closed", False), -x.get("similarity_score", 0)))
        else: available_foods.sort(key=lambda x: (x.get("is_closed", False), -x["protein_g"]))
    return {"suggestions": available_foods, "current_budget": user['remaining_budget'], "remaining_calories": user['remaining_calories']}

@app.post("/confirm")
def confirm_meal(req: ConfirmRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user = cursor.execute("SELECT remaining_budget, remaining_monthly_budget, remaining_calories FROM Users WHERE user_id = ?", (req.user_id,)).fetchone()
        if not user or user['remaining_budget'] < req.price: raise HTTPException(status_code=400, detail="Không đủ tiền!")
        
        food_row = cursor.execute("SELECT food_id FROM Foods WHERE name = ?", (req.food_name,)).fetchone()
        if food_row: food_id_db = food_row['food_id']
        else:
            cursor.execute("INSERT INTO Foods (name, price, image_url, map_url) VALUES (?, ?, ?, ?)", (req.food_name, req.price, req.image_url, req.map_url))
            food_id_db = cursor.lastrowid
            
        # Dùng giờ VN khi lưu lịch sử ăn
        current_time = get_vn_now().strftime("%Y-%m-%dT%H:%M:%S")
        cursor.execute("INSERT INTO MealHistory (user_id, food_id, price_at_time, eaten_at, rating) VALUES (?, ?, ?, ?, ?)", (req.user_id, food_id_db, req.price, current_time, 0))
        
        new_daily_budget = user['remaining_budget'] - req.price
        new_monthly_budget = user['remaining_monthly_budget'] - req.price
        new_calories = max(0, user['remaining_calories'] - req.calories)
        
        cursor.execute('''
            UPDATE Users SET remaining_budget = ?, remaining_monthly_budget = ?, remaining_calories = ? 
            WHERE user_id = ?
        ''', (new_daily_budget, new_monthly_budget, new_calories, req.user_id))
        conn.commit()
        return {"new_budget": new_daily_budget, "new_calories": new_calories}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@app.get("/history/{user_id}")
def get_history(user_id: int):
    conn = get_db_connection()
    history = conn.execute('''SELECT mh.id as history_id, mh.eaten_at, mh.price_at_time, mh.rating, f.name as food_name FROM MealHistory mh LEFT JOIN Foods f ON mh.food_id = f.food_id WHERE mh.user_id = ? ORDER BY mh.eaten_at DESC''', (user_id,)).fetchall()
    conn.close()
    return {"history": [dict(row) for row in history]}

@app.get("/stats/{user_id}")
def get_stats(user_id: int):
    conn = get_db_connection()
    history = conn.execute('''SELECT mh.eaten_at, mh.price_at_time, f.name as food_name FROM MealHistory mh JOIN Foods f ON mh.food_id = f.food_id WHERE mh.user_id = ?''', (user_id,)).fetchall()
    conn.close()
    
    today = get_vn_now() # Dùng giờ VN
    last_7_days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    stats_dict = {d: {"date": d, "spent": 0, "calories": 0} for d in last_7_days}
    
    for h in history:
        date_str = h['eaten_at'][:10]
        if date_str in stats_dict:
            stats_dict[date_str]["spent"] += h["price_at_time"]
            food_info = next((item for item in foods_data if item["name"] == h['food_name']), None)
            if food_info: stats_dict[date_str]["calories"] += food_info["calories"]
            
    result = [{"name": datetime.strptime(d, "%Y-%m-%d").strftime("%d/%m"), "Chi tiêu": stats_dict[d]["spent"], "Calo": stats_dict[d]["calories"]} for d in last_7_days]
    return {"stats": result}