import React, { useState, useEffect } from 'react';
// 下面這一行要特別注意，確認 icon 名稱有沒有寫錯
import { Download, Plus, Trash2, Calendar, Archive, FileSpreadsheet, Table, CheckCircle2 } from 'lucide-react';

const SalaryTracker = () => {
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState({
    hourlyRate: 200,
    overtimeRate1: 1.34,
    overtimeRate2: 1.67,
    settlementDay: 25
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [lastAddedInfo, setLastAddedInfo] = useState(null); // 新增成功提示狀態
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '18:00',
    breakMinutes: 60,
    note: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const recordsResult = await window.storage.get('salary_records');
      const settingsResult = await window.storage.get('salary_settings');
      if (recordsResult?.value) setRecords(JSON.parse(recordsResult.value));
      if (settingsResult?.value) setSettings(JSON.parse(settingsResult.value));
    } catch (error) {
      console.log('初始化資料');
    }
  };

  const saveData = async (newRecords, newSettings) => {
    try {
      await window.storage.set('salary_records', JSON.stringify(newRecords || records));
      await window.storage.set('salary_settings', JSON.stringify(newSettings || settings));
    } catch (error) {
      alert('儲存失敗：' + error.message);
    }
  };

  const calculateSalary = (recordData) => {
    const { checkIn, checkOut, breakMinutes, note } = recordData;
    
    // 邏輯 2: 病假薪資為 0
    if (note === '病假') {
      return {
        regularHours: 0,
        overtime1: 0,
        overtime2: 0,
        overtimeTotal: 0,
        salary: 0,
        finalNote: '病假 (薪資 0)'
      };
    }

    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - breakMinutes;
    const totalHours = Math.max(0, totalMinutes / 60);

    const regularHours = Math.min(totalHours, 8);
    const overtimeTotal = Math.max(totalHours - 8, 0);
    const overtime1 = Math.min(overtimeTotal, 2);
    const overtime2 = Math.max(overtimeTotal - 2, 0);

    let regularPay = regularHours * settings.hourlyRate;
    const overtimePay = (overtime1 * settings.hourlyRate * settings.overtimeRate1) + 
                       (overtime2 * settings.hourlyRate * settings.overtimeRate2);
    
    let finalNote = note;
    
    // 邏輯 3: 雙薪計算 (額外加 8 小時時薪)
    if (note === '雙薪') {
      regularPay += (8 * settings.hourlyRate);
      finalNote = '雙薪 (已外加8hr底薪)';
    }

    return {
      regularHours: regularHours.toFixed(2),
      overtimeTotal: overtimeTotal.toFixed(2),
      overtime1: overtime1.toFixed(2),
      overtime2: overtime2.toFixed(2),
      salary: (regularPay + overtimePay).toFixed(0),
      finalNote: finalNote
    };
  };

  const addRecord = async () => {
    const calc = calculateSalary(newRecord);

    const record = {
      id: Date.now(),
      ...newRecord,
      ...calc,
      note: calc.finalNote
    };

    const updatedRecords = [...records, record].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    await saveData(updatedRecords, settings);

    // 邏輯 4: 顯示成功提示並自動準備隔天日期
    setLastAddedInfo(`已成功新增：${newRecord.date}`);
    setTimeout(() => setLastAddedInfo(null), 3000);

    const nextDay = new Date(newRecord.date);
    nextDay.setDate(nextDay.getDate() + 1);
    setNewRecord({
      ...newRecord,
      date: nextDay.toISOString().split('T')[0],
      note: ''
    });
  };

  // 其餘 Helper Functions (export, delete 等) 保持原樣...
  const getMonthOptions = () => {
    const months = new Set();
    records.forEach(r => months.add(r.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold text-slate-800">💰 薪資出勤追蹤</h1>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">⚙️ 設定</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-slate-50 rounded-xl">
             <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-transparent font-medium focus:outline-none">
                  <option value="all">所有月份</option>
                  {getMonthOptions().map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
               <Download size={16} /> 匯出報表
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="紀錄總數" value={`${records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth)).length} 筆`} color="text-indigo-600" bg="bg-indigo-50" />
            <StatCard title="累計實領薪資" value={`$${records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth)).reduce((acc, r) => acc + Number(r.salary), 0).toLocaleString()}`} color="text-emerald-600" bg="bg-emerald-50" />
          </div>
        </div>

        {/* 邏輯 1: 修正介面重疊問題 - 使用 Responsive Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-blue-500" /> 快速新增紀錄
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <InputGroup label="日期" type="date" value={newRecord.date} onChange={v => setNewRecord({...newRecord, date: v})} />
            <InputGroup label="上班時間" type="time" value={newRecord.checkIn} onChange={v => setNewRecord({...newRecord, checkIn: v})} />
            <InputGroup label="下班時間" type="time" value={newRecord.checkOut} onChange={v => setNewRecord({...newRecord, checkOut: v})} />
            <InputGroup label="休息(分鐘)" type="number" value={newRecord.breakMinutes} onChange={v => setNewRecord({...newRecord, breakMinutes: parseInt(v) || 0})} />
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">備註 / 特殊狀況</label>
              <select 
                value={newRecord.note} 
                onChange={(e) => setNewRecord({...newRecord, note: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">正常上班</option>
                <option value="病假">病假 (不計薪)</option>
                <option value="雙薪">雙薪 (額外加8hr)</option>
                <option value="其他專案">其他專案</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-4">
            <button 
              onClick={addRecord}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-blue-200 shadow-lg transition transform active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} /> 新增這筆紀錄
            </button>
            
            {/* 邏輯 4: 新增成功提示按鈕 */}
            {lastAddedInfo && (
              <div className="flex items-center gap-2 text-emerald-600 font-medium animate-bounce">
                <CheckCircle2 size={20} />
                {lastAddedInfo}
              </div>
            )}
          </div>
        </div>

        {/* 紀錄列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold">歷史清單</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">日期</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">時段</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">工時</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">加班</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">估算薪資</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">備註</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth)).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-sm font-medium">{record.date}</td>
                    <td className="p-4 text-sm text-slate-500">{record.checkIn} - {record.checkOut}</td>
                    <td className="p-4 text-sm font-semibold text-blue-600">{record.regularHours}h</td>
                    <td className="p-4 text-sm font-semibold text-orange-500">{record.overtimeHours}h</td>
                    <td className="p-4 text-sm font-bold text-emerald-600">NT$ {Number(record.salary).toLocaleString()}</td>
                    <td className="p-4">
                      {record.note && (
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          record.note.includes('病假') ? 'bg-red-50 text-red-600' : 
                          record.note.includes('雙薪') ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {record.note}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button onClick={() => {setDeleteTarget(record); setShowDeleteModal(true)}} className="p-2 text-slate-400 hover:text-red-500 transition">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 輔助組件
const StatCard = ({ title, value, color, bg }) => (
  <div className={`${bg} p-4 rounded-xl border border-white/50`}>
    <div className="text-xs font-bold text-slate-500 uppercase mb-1">{title}</div>
    <div className={`text-xl font-black ${color}`}>{value}</div>
  </div>
);

const InputGroup = ({ label, type, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 transition"
    />
  </div>
);


export default SalaryTracker;
