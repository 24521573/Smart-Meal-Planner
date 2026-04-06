import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Moon, MapPin, Calendar, ChevronDown, Clock, Coffee, Utensils, CheckCircle, X, Activity, TrendingDown, Unlock, Star, BarChart2, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('login');
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('Nam');
  const [activity, setActivity] = useState('1.2');
  const [allergies, setAllergies] = useState('');
  const [location, setLocation] = useState('KTX khu A');
  const [filterType, setFilterType] = useState('dinh_duong');
  const [suggestions, setSuggestions] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ĐƯỜNG DẪN BACKEND RENDER CỦA EM
  const API_BASE_URL = 'https://smart-meal-planner-hni4.onrender.com';
  
  const SESSION_KEY = 'smart_meal_session';
  const SESSION_TIMEOUT = 10 * 60 * 1000;

  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      const { savedUser, timestamp } = JSON.parse(storedSession);
      const now = new Date().getTime();
      if (now - timestamp < SESSION_TIMEOUT) {
        setUser(savedUser);
        setCurrentScreen('dashboard');
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const { timestamp } = JSON.parse(storedSession);
        if (new Date().getTime() - timestamp >= SESSION_TIMEOUT) {
          handleLogout();
          alert("Phiên đăng nhập đã hết hạn sau 10 phút. Vui lòng đăng nhập lại!");
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const locations = ['Tòa A', 'Tòa B', 'Tòa C', 'Tòa D', 'Tòa E', 'KTX khu A', 'KTX khu B'];
  const COLORS = ['#ea580c', '#f59e0b', '#3b82f6'];

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        username, password, name,
        monthly_budget: Number(budget) || 0,
        age: Number(age), weight: Number(weight), height: Number(height),
        gender, activity_level: Number(activity), allergies
      };
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Đăng ký thất bại');
      alert(`Đăng ký thành công! TDEE của bạn là: ${Math.round(data.tdee)} calo/ngày.`);
      setActiveTab('login');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Đăng nhập thất bại');
      setUser(data);
      setCurrentScreen('dashboard');
      setError('');
      localStorage.setItem(SESSION_KEY, JSON.stringify({ savedUser: data, timestamp: new Date().getTime() }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    setUser(null); setSuggestions([]); setCurrentScreen('login');
    setUsername(''); setPassword('');
    localStorage.removeItem(SESSION_KEY);
  };

  const fetchMeals = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.user_id || 1, location, filter_type: filterType })
      });
      if (!res.ok) throw new Error('Không tìm thấy món ăn phù hợp!');
      const data = await res.json();
      setSuggestions(data.suggestions);
      const updatedUser = { ...user, remaining_budget: data.current_budget, remaining_calories: data.remaining_calories };
      setUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ savedUser: updatedUser, timestamp: new Date().getTime() }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleConfirm = async (food) => {
    if (!window.confirm(`Xác nhận ăn món ${food.name} với giá ${Number(food.price).toLocaleString()}đ?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, food_name: food.name, price: food.price, calories: food.calories, image_url: food.image_url || "", map_url: food.map_url || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      const updatedUser = { ...user, remaining_budget: data.new_budget, remaining_calories: data.new_calories };
      setUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ savedUser: updatedUser, timestamp: new Date().getTime() }));
      alert("Đã ghi nhận bữa ăn!");
      setSuggestions([]);
    } catch (err) { alert(err.message); }
  };

  const handleTopUp = async () => {
    const amountStr = window.prompt("Nhập số tiền bạn muốn ỨNG TRƯỚC từ quỹ tháng (VNĐ):\nLưu ý: Tiền ăn các ngày sau sẽ tự động giảm xuống.", "50000");
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Số tiền không hợp lệ!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, amount: amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      const updatedUser = { ...user, remaining_budget: data.new_budget };
      setUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ savedUser: updatedUser, timestamp: new Date().getTime() }));
      
      alert(`Đã ứng thành công ${amount.toLocaleString()}đ! Mua đồ ăn ngay thôi.`);
      setSuggestions([]);
    } catch (err) { alert(err.message); }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/history/${user.user_id}`);
      const data = await res.json();
      setHistoryList(data.history);
      setShowHistory(true);
    } catch (err) { alert("Lỗi tải lịch sử"); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/stats/${user.user_id}`);
      const data = await res.json();
      setStatsData(data.stats);
      setShowStats(true);
    } catch (err) { alert("Lỗi tải bảng thống kê"); }
  };

  const handleRate = async (historyId, ratingValue) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_id: historyId, rating: ratingValue })
      });
      if (!res.ok) throw new Error("Lỗi khi lưu đánh giá");
      setHistoryList(prev => prev.map(item => item.history_id === historyId ? { ...item, rating: ratingValue } : item));
    } catch (err) { alert(err.message); }
  };

  const formatTime = (date) => date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatHistoryTime = (dateString) => {
    if (!dateString) return '';
    const safeDateStr = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const date = new Date(safeDateStr);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (currentScreen === 'login') {
    return (
      <div className="min-h-screen bg-[#fff8f0] flex justify-center items-center p-4 font-sans text-gray-800">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#ea580c] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-orange-200">🍜</div>
            <h1 className="text-xl font-bold text-gray-900">Smart Meal Planner</h1>
          </div>
          <h2 className="text-4xl font-extrabold mb-2 text-gray-900">Welcome! 👋</h2>
          <p className="text-gray-500 mb-8 font-medium">Nutrition recommendation system</p>
          <div className="flex bg-[#fed7aa] rounded-2xl p-1 mb-8">
            <button className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'login' ? 'bg-[#ea580c] text-white shadow-md' : 'text-[#c2410c] hover:bg-orange-300'}`} onClick={() => { setActiveTab('login'); setError(''); }}>Đăng nhập</button>
            <button className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'register' ? 'bg-[#ea580c] text-white shadow-md' : 'text-[#c2410c] hover:bg-orange-300'}`} onClick={() => { setActiveTab('register'); setError(''); }}>Đăng ký</button>
          </div>
          {error && <p className="text-red-500 bg-red-50 p-3 rounded-xl font-medium mb-6 border border-red-100">{error}</p>}
          <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {activeTab === 'register' && (
              <div>
                <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Họ và tên</label>
                <input type="text" required placeholder="Nhập họ và tên" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">👤 Tên đăng nhập</label>
                <input type="text" required placeholder="Nhập tên đăng nhập" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">🔒 Mật khẩu</label>
                <input type="password" required placeholder="Nhập mật khẩu" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {activeTab === 'register' && (
              <div className="animate-in fade-in slide-in-from-top-4 space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Tuổi</label>
                    <input type="number" required placeholder="VD: 20" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Giới tính</label>
                    <select className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c] bg-white" value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Cân nặng (kg)</label>
                    <input type="number" required placeholder="VD: 65" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Chiều cao (cm)</label>
                    <input type="number" required placeholder="VD: 170" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={height} onChange={(e) => setHeight(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Mức độ vận động</label>
                    <select className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c] bg-white" value={activity} onChange={(e) => setActivity(e.target.value)}>
                      <option value="1.2">Ít vận động</option>
                      <option value="1.55">Vừa phải</option>
                      <option value="1.725">Năng động</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">💰 Ngân sách/tháng</label>
                    <input type="number" required min="10000" placeholder="VD: 3000000" className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={budget} onChange={(e) => setBudget(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-gray-600 font-bold mb-2">Dị ứng (cách nhau dấu phẩy)</label>
                  <input type="text" placeholder="VD: tôm, trứng, sữa..." className="w-full border-2 border-orange-100 rounded-2xl p-3 outline-none focus:border-[#ea580c]" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                </div>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-4 rounded-2xl mt-4 transition shadow-xl shadow-orange-200/50">
              {loading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập →' : 'Tạo Profile AI →')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f0] font-sans text-gray-800 pb-10">
      {user?.streak >= 3 && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.3)] border-2 border-orange-200 flex flex-col items-center gap-1 z-40 animate-bounce cursor-pointer group hover:bg-orange-50 transition-colors">
          <div className="text-4xl animate-pulse group-hover:scale-110 transition-transform">🔥</div>
          <p className="font-black text-[#ea580c] text-lg leading-none mt-1">{user.streak}</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ngày</p>
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-max bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Bạn đang có chuỗi {user.streak} ngày rực cháy!
          </div>
        </div>
      )}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[30px] p-6 md:p-8 shadow-2xl relative animate-in zoom-in duration-200">
             <button onClick={() => setShowHistory(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 hover:bg-gray-200 hover:text-red-500 transition"><X size={20} /></button>
             <h2 className="text-2xl font-extrabold text-[#ea580c] mb-6 flex items-center gap-3"><Calendar className="text-orange-400"/> Lịch sử & Đánh giá</h2>
             <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 scrollbar-thin">
                {historyList.length === 0 ? (
                   <div className="text-center py-12"><p className="text-6xl mb-4">🍽️</p><p className="text-gray-500 font-medium">Bạn chưa xác nhận ăn món nào cả!</p></div>
                ) : (
                   historyList.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-orange-50/50 p-5 rounded-2xl border border-orange-100 hover:border-orange-300 transition">
                         <div>
                           <p className="font-bold text-gray-800 text-lg">{item.food_name ? item.food_name : 'Đang cập nhật tên món'}</p>
                           <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1.5 mb-2"><Clock size={14} className="text-orange-400"/> {formatHistoryTime(item.eaten_at)}</p>
                           <div className="flex gap-1">
                             {[1, 2, 3, 4, 5].map((star) => (
                               <Star key={star} size={18} onClick={() => handleRate(item.history_id, star)} className={`cursor-pointer transition-colors ${star <= (item.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`} />
                             ))}
                           </div>
                         </div>
                         <p className="font-black text-[#ea580c] bg-white px-4 py-2 rounded-xl shadow-sm border border-orange-50">{Number(item.price_at_time).toLocaleString()}đ</p>
                      </div>
                   ))
                )}
             </div>
          </div>
        </div>
      )}
      {showStats && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[30px] p-6 md:p-8 shadow-2xl relative animate-in zoom-in duration-200">
             <button onClick={() => setShowStats(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 hover:bg-gray-200 hover:text-red-500 transition"><X size={20} /></button>
             <h2 className="text-2xl font-extrabold text-[#16a34a] mb-6 flex items-center gap-3"><BarChart2 className="text-green-500"/> Thống kê 7 ngày gần nhất</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div className="bg-green-50/30 p-4 rounded-2xl border border-green-50">
                   <h3 className="font-bold text-gray-700 text-center mb-6">📉 Lịch sử Chi tiêu (VNĐ)</h3>
                   <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={statsData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                         <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                         <Bar dataKey="Chi tiêu" fill="#16a34a" radius={[6, 6, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-orange-50/30 p-4 rounded-2xl border border-orange-50">
                   <h3 className="font-bold text-gray-700 text-center mb-6">🔥 Lượng Calo nạp vào</h3>
                   <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={statsData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                         <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                         <Line type="monotone" dataKey="Calo" stroke="#ea580c" strokeWidth={4} dot={{r: 5, fill: '#ea580c'}} activeDot={{r: 8}} />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
      <div className="bg-[#cd5b18] text-white pt-6 pb-20 px-6 sm:px-12 rounded-b-[40px] shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl">🍜</div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wide">Smart Meal Planner</h1>
              <p className="text-orange-200 text-sm font-medium">UIT - Bui Trong Tan</p>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold">{formatTime(currentTime)}</h2>
            <p className="text-orange-200 text-sm font-medium capitalize">{formatDate(currentTime)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block"><p className="font-bold text-lg">{user?.name || 'Sinh viên'}</p></div>
            <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center text-2xl overflow-hidden border-2 border-white">👨‍🎓</div>
            <button onClick={handleLogout} className="border border-white/30 hover:bg-white/10 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 text-sm">Đăng xuất</button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-orange-100/50 border border-orange-50">
            <div className="flex justify-between items-start mb-2">
              <p className="text-gray-500 font-bold tracking-wide text-xs">NGÂN SÁCH HÔM NAY</p>
              <div className="flex gap-2">
                <button onClick={handleTopUp} className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center text-green-700 font-black transition shadow-sm" title="Ứng tiền từ quỹ tháng">+</button>
                <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-600 text-sm">💰</div>
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#16a34a] mb-2 transition-all duration-500">{Number(user?.remaining_budget || 0).toLocaleString()} đ</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div className="bg-[#16a34a] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min((user?.remaining_budget / user?.daily_budget) * 100, 100))}%` }}></div>
            </div>
            <div className="flex justify-between items-start mb-2 pt-2 border-t border-gray-100">
              <p className="text-gray-500 font-bold tracking-wide text-xs">CALO TRONG NGÀY (TDEE)</p>
              <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 text-sm"><Activity size={14}/></div>
            </div>
            <p className="text-2xl font-extrabold text-[#ea580c] mb-2 transition-all duration-500">{Math.round(user?.remaining_calories || 0)} kcal</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div className="bg-[#ea580c] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min((user?.remaining_calories / user?.tdee) * 100, 100))}%` }}></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-3xl p-6 shadow-xl shadow-orange-200 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
             <p className="font-bold tracking-wide text-sm text-orange-100 mb-6">BỮA ĂN HIỆN TẠI</p>
             <div className="flex items-center gap-4 mb-8">
                {currentTime.getHours() >= 17 ? <Moon size={40} className="text-yellow-300" /> : <Coffee size={40} className="text-yellow-300" />}
                <div>
                  <h3 className="text-3xl font-extrabold">{currentTime.getHours() >= 17 ? 'Bữa Tối' : (currentTime.getHours() >= 11 ? 'Bữa Trưa' : 'Bữa Sáng')}</h3>
                  <p className="text-orange-200 font-medium mt-1">Phục vụ theo giờ</p>
                </div>
             </div>
             <div className="bg-black/20 backdrop-blur-sm inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"><Clock size={16} /> Hiện tại: {formatTime(currentTime)}</div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-orange-100/50 border border-orange-50 flex flex-col justify-between">
             <p className="text-gray-500 font-bold tracking-wide text-sm mb-4 flex items-center gap-2"><MapPin size={16} className="text-pink-500"/> VỊ TRÍ CỦA TÔI</p>
             <div className="relative mb-4">
                <select className="w-full appearance-none border-2 border-orange-100 rounded-2xl p-4 font-bold text-lg text-gray-800 outline-none focus:border-[#ea580c] bg-transparent" value={location} onChange={(e) => setLocation(e.target.value)}>
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
             </div>
             <div className="flex gap-2">
                <button onClick={() => setFilterType('dinh_duong')} className={`flex-1 px-2 py-3 rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 transition ${filterType === 'dinh_duong' ? 'bg-[#ea580c] text-white shadow-md' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'}`}>
                  <Activity size={14}/> Theo Dinh dưỡng
                </button>
                <button onClick={() => setFilterType('gia_re')} className={`flex-1 px-2 py-3 rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 transition ${filterType === 'gia_re' ? 'bg-[#16a34a] text-white shadow-md' : 'bg-green-50 text-green-800 hover:bg-green-100'}`}>
                  <TrendingDown size={14}/> Theo Giá rẻ
                </button>
             </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <button onClick={fetchMeals} disabled={loading} className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white text-lg font-bold py-4 rounded-2xl shadow-xl shadow-orange-200/50 transition flex items-center justify-center gap-2">
            {loading ? <span className="animate-pulse">Đang phân tích...</span> : <><Utensils size={20} /> Đề xuất món ăn</>}
          </button>
          <button onClick={fetchHistory} className="w-full bg-white hover:bg-gray-50 text-gray-700 text-lg font-bold py-4 rounded-2xl shadow-lg shadow-orange-100/30 border border-orange-100 transition flex items-center justify-center gap-2">
            <Calendar size={20} className="text-orange-500" /> Lịch sử hôm nay
          </button>
          <button onClick={fetchStats} className="w-full bg-white hover:bg-gray-50 text-gray-700 text-lg font-bold py-4 rounded-2xl shadow-lg shadow-green-100/30 border border-green-100 transition flex items-center justify-center gap-2">
            <BarChart2 size={20} className="text-green-600" /> Thống kê tuần
          </button>
        </div>
        {error && <p className="text-red-500 text-center font-bold mt-6 bg-red-50 p-4 rounded-2xl border border-red-100">{error}</p>}
        {suggestions.length > 0 && (
          <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center mb-8">
              <span className="bg-orange-100 text-orange-800 text-sm font-bold px-4 py-1.5 rounded-full">
                {filterType === 'gia_re' ? 'KẾT QUẢ TỐI ƯU CHI PHÍ' : 'KẾT QUẢ TỐI ƯU DINH DƯỠNG'}
              </span>
              <h2 className="text-2xl font-extrabold text-gray-800 mt-4">Danh sách món ăn gợi ý cho bạn</h2>
            </div>
            {suggestions.map((food, idx) => {
              const canAfford = food.price <= user.remaining_budget;
              const isClosed = food.is_closed;
              const isAvailable = canAfford && !isClosed;
              return (
                <div key={idx} className={`bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 overflow-hidden ${isAvailable ? 'border-orange-50 shadow-orange-100/50' : 'border-gray-200 opacity-70'} flex flex-col md:flex-row items-stretch`}>
                  <div className="md:w-1/3 relative overflow-hidden flex items-center justify-center p-4 bg-gray-50 md:border-r border-gray-100">
                    <img src={food.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500'} alt={food.name} className={`rounded-2xl w-full h-full object-contain ${!isAvailable && 'grayscale'}`} />
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center backdrop-blur-[1px] p-2 mx-4 my-4">
                         <span className="text-white text-xs font-black uppercase tracking-wider text-center">
                            {food.is_closed ? 'ĐÃ ĐÓNG CỬA' : 'HẾT NGÂN SÁCH'}
                         </span>
                      </div>
                    )}
                  </div>
                  <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 ${
                          isClosed ? 'bg-gray-200 text-gray-600' : (!canAfford ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700')
                        }`}>
                          {isClosed ? <><X size={16}/> ĐÃ ĐÓNG CỬA</> : (!canAfford ? <><X size={16}/> VƯỢT NGÂN SÁCH</> : <><Unlock size={16}/> ĐANG MỞ CỬA</>)}
                        </span>
                      </div>
                      <button onClick={() => handleConfirm(food)} disabled={!isAvailable} className={`px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition w-full sm:w-auto ${isAvailable ? 'bg-[#16a34a] text-white hover:bg-green-700 shadow-lg shadow-green-200/50' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                        {isClosed ? <><X size={18}/> Đóng cửa</> : (!canAfford ? <><X size={18}/> Hết tiền</> : <><CheckCircle size={18}/> Xác nhận ăn</>)}
                      </button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className={`${isAvailable ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'} p-6 rounded-2xl border flex flex-col flex-1 justify-center`}>
                        <h3 className={`text-2xl font-extrabold mb-2 ${isAvailable ? 'text-[#c2410c]' : 'text-gray-600'}`}>{food.name}</h3>
                        <div className="flex flex-col mb-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Địa chỉ</span>
                          <a href={food.map_url || '#'} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 font-medium transition-all group w-max ${isAvailable ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500 pointer-events-none'}`}>
                            <MapPin size={18} className="text-pink-500"/>
                            <span className="group-hover:underline">{food.restaurant_name}</span>
                            {isAvailable && <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </a>
                        </div>
                        <div className="bg-white px-4 py-3 rounded-xl inline-block w-max mb-4 shadow-sm">
                          <p className={`font-extrabold text-xl ${isAvailable ? 'text-gray-800' : 'text-gray-400 line-through'}`}>💰 {Number(food.price || 0).toLocaleString()} VNĐ</p>
                        </div>
                      </div>
                      <div className={!isAvailable ? 'opacity-60 grayscale' : ''} style={{width: 150}}>
                        <h3 className="font-bold text-gray-700 text-center mb-4 text-xs tracking-wider">TỶ LỆ DINH DƯỠNG</h3>
                        <div className="h-36 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[
                                  { name: 'Protein (g)', value: Number(food.protein_g || 0) },
                                  { name: 'Carb (g)', value: Number(food.carb_g || 0) },
                                  { name: 'Fat (g)', value: Number(food.fat_g || 0) }
                                ]} cx="50%" cy="50%" innerRadius={35} outerRadius={50} fill="#8884d8" paddingAngle={2} dataKey="value">
                                {[0, 1, 2].map((entry, index) => <Cell key={`cell-${index}`} fill={isAvailable ? COLORS[index % COLORS.length] : '#9ca3af'} />)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                              <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: 10}} iconType="circle"/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}