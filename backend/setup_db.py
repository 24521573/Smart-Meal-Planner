import sqlite3
import os

# Đường dẫn tới file database sẽ được tạo
db_path = "meal_planner.db"

# Xóa database cũ nếu đã tồn tại để làm lại từ đầu (tránh lỗi trùng lặp)
if os.path.exists(db_path):
    os.remove(db_path)

# Kết nối và tạo file database mới
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Đọc và thực thi file SQL để tạo các bảng
with open("init_db.sql", "r", encoding="utf-8") as f:
    sql_script = f.read()

cursor.executescript(sql_script)

print("Đã khởi tạo Database 'meal_planner.db' thành công!")

conn.commit()
conn.close()