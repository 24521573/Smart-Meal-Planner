-- 1. Bảng Users (Sinh viên)
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    daily_budget DECIMAL(10, 2) NOT NULL,
    remaining_budget DECIMAL(10, 2) NOT NULL
);

-- 2. Bảng Restaurants (Quán ăn và Vị trí cố định)
CREATE TABLE Restaurants (
    restaurant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(100) NOT NULL
);

-- 3. Bảng Foods (Món ăn và Dinh dưỡng)
CREATE TABLE Foods (
    food_id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    calories INTEGER,
    protein_g DECIMAL(5, 2),
    carb_g DECIMAL(5, 2),
    fat_g DECIMAL(5, 2),
    allergens VARCHAR(200),
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id)
);

-- 4. Bảng MealHistory (Lịch sử ăn uống)
CREATE TABLE MealHistory (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    food_id INTEGER,
    eaten_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_at_time DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (food_id) REFERENCES Foods(food_id)
);

-- 5. TRIGGER: Tự động trừ remaining_budget khi thêm món vào MealHistory
CREATE TRIGGER update_budget_after_meal
AFTER INSERT ON MealHistory
BEGIN
    UPDATE Users
    SET remaining_budget = remaining_budget - NEW.price_at_time
    WHERE user_id = NEW.user_id;
END;