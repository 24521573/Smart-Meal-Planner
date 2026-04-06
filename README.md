<p align="center">
  <img src="https://www.uit.edu.vn/strapi/uploads/LOGO_VNA_c054066f11_7d72ba6441.png" alt="Trường Đại học Công nghệ Thông tin" width="550" />
</p>

<h1 align="center">CS117 - TƯ DUY TÍNH TOÁN</h1>

# TECHNICAL DESIGN DOCUMENT (TDD): SMART MEAL PLANNER RECOMMENDATION ENGINE
**Dự án:** Smart Meal Planner

🚀 **Live Demo:** [https://recommendation-items-system.vercel.app/](https://recommendation-items-system.vercel.app/)

⚡ **API Backend:** [https://recommendation-items-system.onrender.com/products](https://recommendation-items-system.onrender.com/products)

> **💡 Lưu ý khi test:** Hệ thống Backend được triển khai trên nền tảng miễn phí (Render Free Tier). Nếu web mất khoảng 30-50 giây để tải sản phẩm ở lần truy cập đầu tiên, xin vui lòng đợi một chút để server "thức dậy". Sau đó hệ thống AI sẽ gợi ý với tốc độ cực nhanh!

---

# GIỚI THIỆU MÔN HỌC 

|||
| :--- | :--- |
| **Môn học** | Computational Thinking |
| **Mã lớp** | CS117.Q22 |
| **Giảng viên** | PGS.TS Ngô Đức Thành |
| **Sinh viên** | Bùi Trọng Tấn |
| **MSSV** | 24521573 |

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM OVERVIEW)
Hệ thống Smart Meal Planner được thiết kế dựa trên kiến trúc **Hybrid Recommendation System** (Hệ thống gợi ý lai). Kiến trúc này giải quyết bài toán gợi ý bữa ăn cá nhân hóa trong môi trường khép kín (như Ký túc xá, Căn tin trường đại học) bằng cách kết hợp 2 phương pháp:
1. **Rule-based Hard Filtering (Lọc thô theo luật):** Loại bỏ các nhiễu dữ liệu (out-of-context items) dựa trên rào cản thực tế (vị trí, giờ giấc, rủi ro dị ứng).
2. **Content-Based Filtering (Lọc dựa trên nội dung):** Sử dụng Vector Space Model (Mô hình không gian vector) để đo lường khoảng cách giữa hành vi tiêu dùng trong quá khứ và đặc tính dinh dưỡng của món ăn.

---

## 2. ĐẶC TẢ YÊU CẦU & PHẠM VI (SPECIFICATIONS & SCOPE)

### 2.1. Inputs & Outputs
* **Đầu vào (Inputs):**
  * *Static Profile:* Tuổi, giới tính, cân nặng, chiều cao, dị nguyên (allergies), quỹ ngân sách tháng.
  * *Dynamic Context:* Vị trí truy vấn (Location), mục tiêu tối ưu (`dinh_duong` hoặc `gia_re`), thời gian thực tế (`current_hour`).
  * *User Feedback:* Lịch sử tiêu dùng và điểm đánh giá sao (Explicit Feedback).
* **Đầu ra (Outputs):**
  * Danh sách các món ăn đã được xếp hạng (Ranked Items) kèm metadata (is_closed, similarity_score).
  * Trạng thái tài chính và calo còn lại trong ngày (Real-time State).

### 2.2. Giả định Kỹ thuật (Assumptions)
1. **Implicit Feedback:** Bữa ăn chưa đánh giá sao được gán trọng số $W = 3$ (Hài lòng trung tính).
2. **Không gian Vector:** Hai món ăn khác nhau về lượng Calo tổng nhưng có cùng tỷ lệ Pro/Carb/Fat sẽ có góc Vector tương đồng ($\approx 0^{\circ}$).
3. **Data Integrity:** Dữ liệu dinh dưỡng trong `mock_data.json` là chính xác và tĩnh trong suốt runtime.

### 2.3. Ràng buộc Hệ thống (Constraints)
* **Zero-Tolerance Allergy:** Ràng buộc cứng. Thực phẩm chứa dị nguyên khớp với User Profile bị loại bỏ vĩnh viễn ở khâu Retrieval.
* **Budget Ceiling:** Không cho phép xác nhận giao dịch nếu giá trị thực phẩm lớn hơn Ngân sách còn lại.
* **Database Concurrency:** Sử dụng SQLite, bị giới hạn I/O khi có lượng lớn Concurrent Writes.

---

## 3. QUẢN LÝ DỮ LIỆU & NGỮ CẢNH NGƯỜI DÙNG (DATA & CONTEXT MANAGEMENT)

### 3.1. Lập hồ sơ Sinh học (Biometric Profiling)
Hệ thống áp dụng phương trình **Mifflin-St Jeor** (chuẩn xác nhất cho người trưởng thành) để nội suy Tỉ lệ trao đổi chất cơ bản (BMR) và Tổng năng lượng tiêu hao (TDEE).

$$BMR_{nam} = (10 \times Weight) + (6.25 \times Height) - (5 \times Age) + 5$$
$$BMR_{nữ} = (10 \times Weight) + (6.25 \times Height) - (5 \times Age) - 161$$
$$TDEE = BMR \times Activity\_Level$$

### 3.2. Quy hoạch Ngân sách Động (Dynamic Budget Allocation)
Áp dụng kỹ thuật **Drawdown (Ứng trước quỹ)** để xử lý các Edge Cases về tài chính của sinh viên:
* Khi sinh viên tiêu vượt mức và bấm "Ứng tiền", hệ thống trừ trực tiếp vào **Quỹ tháng**.
* Thuật toán tự động tái phân bổ tiền ăn mỗi ngày cho các ngày còn lại:
  $$Daily\_Budget = \frac{Remaining\_Monthly\_Budget}{Days\_In\_Month - Current\_Day + 1}$$
* *Tác động:* Hệ thống tạo ra cơ chế "Tự động trừng phạt" (giảm tiền ăn các ngày sau) để ép sinh viên cân đối tài chính.

### 3.3. Đánh giá lười & Quản lý trạng thái (Lazy Evaluation State Management)
Loại bỏ hoàn toàn tiến trình ngầm (Cronjobs/Celery) để tiết kiệm tài nguyên.
* **Cơ chế:** Chỉ tính toán lại State khi có Request gọi API bằng cách đo lường `Time-Series Delta` giữa `last_login_date` và `current_date`.
* **Tính điểm chuỗi (Gamification Streak):**
  $$Streak_{new} = \begin{cases} Streak_{old} + 1 & \text{if } \Delta days = 1 \\ 1 & \text{if } \Delta days > 1 \end{cases}$$

---

## 4. PIPELINE HỆ THỐNG GỢI Ý (RECOMMENDATION PIPELINE)

Hệ thống hoạt động qua 4 giai đoạn (Phases) chạy tuần tự:

### Phase 1: Candidate Generation (Tạo tập ứng viên)
Giảm không gian tìm kiếm từ tập $D$ xuống tập khả thi $C$ qua **Boolean Exclusion Rules**:
* Lọc vị trí: `request.location == food.location`
* Lọc dị ứng: `Intersection(User_Allergies, Food_Allergens) == \emptyset`
* Lọc ngữ cảnh: `is_canteen_open` (Dựa trên giờ thực tế).

### Phase 2: Feature Engineering & Profiling (Trích xuất đặc trưng)
Ánh xạ người dùng và món ăn vào Không gian Vector 4 chiều ($R^4$): $\vec{v} = [Calories, Protein, Carb, Fat]$.
* **Item Profile ($\vec{I_j}$):** Trích xuất từ metadata món ăn.
* **Dynamic User Profile ($\vec{U}$):** Tính toán Real-time từ `MealHistory` bằng **Trung bình có trọng số (Weighted Average)**.

$$\vec{U} = \frac{\sum_{i=1}^{H} w_i \cdot \vec{I_i}}{\sum_{i=1}^{H} w_i}$$
*(Với $w_i$ là Rating từ 1-5 sao. Phép tính này kéo vector người dùng về phía các món đánh giá cao và đẩy xa khỏi món đánh giá thấp).*

### Phase 3: Scoring Mechanism (Cơ chế tính điểm)
Sử dụng **Cosine Similarity** để đo góc $\theta$ giữa 2 vector, bỏ qua độ lớn (magnitude), tập trung so sánh tỷ lệ phân bổ chất.

$$\cos(\theta) = \frac{\vec{U} \cdot \vec{I_j}}{||\vec{U}|| \times ||\vec{I_j}||} = \frac{\sum (U_k \times I_{jk})}{\sqrt{\sum U_k^2} \times \sqrt{\sum I_{jk}^2}}$$

### Phase 4: Re-ranking & Multi-Objective Optimization (Xếp hạng lại)
Tích hợp chiến lược xử lý **User Cold-Start Problem** (Vấn đề khởi động lạnh).

| Tiêu chí | Điều kiện (Context) | Chiến lược Sorting / Xếp hạng |
| :--- | :--- | :--- |
| **Giá rẻ** | Tối ưu chi phí | Sắp xếp tăng dần theo `price`. |
| **Dinh dưỡng** | Tối ưu sức khỏe + Đã có lịch sử | Sắp xếp giảm dần theo `similarity_score`. |
| **Cold-Start** | User mới tinh, Lịch sử trống | **Heuristic Fallback:** Sắp xếp giảm dần theo hàm lượng `protein_g` (Dựa trên Domain Knowledge: Protein quyết định độ no và phục hồi cơ bắp). |

*Lưu ý:* Áp dụng **Multi-level Sorting** qua Tuple `(x.get("is_closed"), metric)` để đẩy toàn bộ các nhà hàng đóng cửa xuống cuối danh sách.

---

## 5. PHÂN TÍCH ĐỘ PHỨC TẠP THUẬT TOÁN (COMPLEXITY ANALYSIS)

Mã nguồn tối ưu cho tốc độ phản hồi thời gian thực (Real-time serving latency):
* **Độ phức tạp thời gian (Time Complexity):**
  * Duyệt lịch sử tạo User Vector: $\mathcal{O}(H)$.
  * Tính Cosine Similarity trên mảng JSON: $\mathcal{O}(M)$.
  * Sắp xếp Timsort: $\mathcal{O}(M \log M)$.
  * Tổng thời gian: $\mathcal{O}(H + M \log M)$. Rất tối ưu cho tập dữ liệu $M < 100,000$.
* **Độ phức tạp không gian (Space Complexity):**
  * Lưu trữ mảng `available_foods` trong RAM: $\mathcal{O}(M)$.

---

## 6. ĐO LƯỜNG VÀ ĐÁNH GIÁ (METRICS & EVALUATION)

Hệ thống đánh giá hiệu năng dựa trên 3 nhóm chỉ số cốt lõi:

### 6.1. Offline Evaluation (Đánh giá thuật toán)
* **Precision@K / Recall@K:** Độ chính xác của Top K món ăn được đề xuất.
* **NDCG@K (Normalized Discounted Cumulative Gain):** Đánh giá chất lượng Ranking có tính đến thứ tự hiển thị.
* **Catalog Coverage:** Tỷ lệ phần trăm món ăn từng được hiển thị, đo lường khả năng khám phá món mới (Novelty).

### 6.2. Online / Business Metrics (Đánh giá nghiệp vụ)
* **Acceptance Rate:** Tỷ lệ sinh viên nhấn "Xác nhận ăn" trên tổng số lần gọi hàm `recommend_meals`.
* **Cold-Start Conversion Rate:** Tỷ lệ chốt đơn của người dùng mới khi hệ thống dùng Fallback (Gợi ý theo Protein).
* **Retention Rate:** Tỷ lệ sinh viên kích hoạt thành công $Streak \ge 3$ nhờ yếu tố Gamification.

### 6.3. System Metrics (Đánh giá hệ thống)
* **P95 Latency:** Độ trễ phải $< 200ms$ cho 95% lượng request.
* **Throughput:** Khả năng chịu tải (RPS) của module Lazy Evaluation vào giờ cao điểm căn tin.
