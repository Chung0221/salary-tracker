import React, { useState, useEffect } from 'react';
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
  const [lastAddedInfo, setLastAddedInfo] = useState(null);
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

  // 修復問題 3: 使用標準 localStorage 避免 undefined 錯誤
  const loadData = () => {
    try {
      const savedRecords = localStorage.getItem('salary_records');
      const savedSettings = localStorage.getItem('salary_settings');
      if (savedRecords) setRecords(JSON.parse(savedRecords));
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (error) {
      console.log('載入資料失敗', error);
    }
  };

  const saveData = (newRecords, newSettings) => {
    try {
      localStorage.setItem('salary_records', JSON.stringify(newRecords || records));
      localStorage.setItem('salary_settings', JSON.stringify(newSettings || settings));
    } catch (error) {
      alert('儲存失敗：' + error.message);
    }
  };

  const calculateSalary = (recordData) => {
    const { checkIn, checkOut, breakMinutes, note } = recordData;
    
    if (note === '病假') {
      return { regularHours: 0, overtime1: 0, overtime2: 0, overtimeTotal: 0, salary: 0, finalNote: '病假 (不計薪)' };
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
    if (note === '雙薪') {
      regularPay += (8 * settings.hourlyRate);
      finalNote = '雙薪 (已加8h底薪)';
    }

    return {
      regularHours: regularHours.toFixed(2),
      overtimeTotal: overtimeTotal.toFixed(2),
      overtime1: overtime1.toFixed(2),
      overtime2: overtime2.toFixed(2),
      salary: Math.round(regularPay + overtimePay),
      finalNote: finalNote
    };
  };

  const addRecord = () => {
    const calc = calculateSalary(newRecord);
    const record = {
      id: Date.now(),
      ...newRecord,
      ...calc,
      note: calc.finalNote
    };

    const updatedRecords = [record, ...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    saveData(updatedRecords, settings);

    setLastAddedInfo(`已成功新增：${newRecord.date}`);
    setTimeout(() => setLastAddedInfo(null), 3000);

    const nextDay = new Date(newRecord.date);
    nextDay.setDate(nextDay.getDate() + 1);
    setNewRecord({ ...newRecord, date: nextDay.toISOString().split('T')[0], note: '' });
  };

  // 修復問題 6: 刪除功能
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updatedRecords = records.filter(r => r.id !== deleteTarget.id);
    setRecords(updatedRecords);
    saveData(updatedRecords, settings);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // 修復問題 2: 匯出功能
  const exportToCSV = () => {
    const recordsToExport = filterMonth === 'all' ? records : records.filter(r => r.date.startsWith(filterMonth));
    if (recordsToExport.length === 0) return alert('沒有資料');
    
    let csv = '\ufeff日期,上班,下班,休息,正常時數,1.34時數,1.67時數,總加班,薪資,備註\n';
    recordsToExport.forEach(r => {
      csv += `${r.date},${r.checkIn},${r.checkOut},${r.breakMinutes},${r.regularHours},${r.overtime1},${r.overtime2},${r.overtimeTotal},${r.salary},${r.note}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `薪資報表_${filterMonth}.csv`;
    link.click();
    setShowExportModal(false);
  };

  const getMonthOptions = () => {
    const months = new Set();
    records.forEach(r => months.add(r.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">💰 薪資出勤系統</h1>
            <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">
              {showSettings ? '✖ 關閉設定' : '⚙️ 系統設定'}
            </button>
          </div>

          {/* 修復問題 1: 設定面板顯示邏輯 */}
          {showSettings && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 border border-blue-100">
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1">時薪 (NT$)</label>
                <input type="number" value={settings.hourlyRate} onChange={(e) => {
                  const newSettings = {...settings, hourlyRate: Number(e.target.value)};
                  setSettings(newSettings);
                  saveData(null, newSettings);
                }} className="w-full p-2 rounded-lg border-blue-200 border focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1">加班 1.34</label>
                <input type="number" step="0.01" value={settings.overtimeRate1} onChange={(e) => {
                  const newSettings = {...settings, overtimeRate1: Number(e.target.value)};
                  setSettings(newSettings);
                  saveData(null, newSettings);
                }} className="w-full p-2 rounded-lg border-blue-200 border" />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1">加班 1.67</label>
                <input type="number" step="0.01" value={settings.overtimeRate2} onChange={(e) => {
                  const newSettings = {...settings, overtimeRate2: Number(e.target.value)};
                  setSettings(newSettings);
                  saveData(null, newSettings);
                }} className="w-full p-2 rounded-lg border-blue-200 border" />
              </div>
              <div className="flex items-end">
                 <p className="text-xs text-blue-500 pb-2">※ 變更將立即儲存</p>
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-white/50">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">當前篩選總薪資</div>
              <div className="text-2xl font-black text-emerald-600">
                NT$ {records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth))
                      .reduce((acc, r) => acc + Number(r.salary), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 新增紀錄區 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus size={20} className="text-blue-500" /> 新增出勤紀錄
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <InputGroup label="日期" type="date" value={newRecord.date} onChange={v => setNewRecord({...newRecord, date: v})} />
            <InputGroup label="上班" type="time" value={newRecord.checkIn} onChange={v => setNewRecord({...newRecord, checkIn: v})} />
            <InputGroup label="下班" type="time" value={newRecord.checkOut} onChange={v => setNewRecord({...newRecord, checkOut: v})} />
            <InputGroup label="休息(分)" type="number" value={newRecord.breakMinutes} onChange={v => setNewRecord({...newRecord, breakMinutes: parseInt(v) || 0})} />
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">備註</label>
              <select value={newRecord.note} onChange={(e) => setNewRecord({...newRecord, note: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">正常上班</option>
                <option value="病假">病假</option>
                <option value="雙薪">雙薪</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button onClick={addRecord} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition flex items-center gap-2">
              <Plus size={20} /> 新增紀錄
            </button>
            {lastAddedInfo && (
              <div className="flex items-center gap-2 text-emerald-600 font-medium animate-pulse">
                <CheckCircle2 size={20} /> {lastAddedInfo}
              </div>
            )}
          </div>
        </div>

        {/* 紀錄列表 - 修復問題 4 & 5 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 font-bold">歷史清單</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-xs font-bold text-slate-500">日期</th>
                  <th className="p-4 text-xs font-bold text-slate-500">正常工時</th>
                  <th className="p-4 text-xs font-bold text-slate-500">加班 (1.34/1.67)</th>
                  <th className="p-4 text-xs font-bold text-slate-500">總加班</th>
                  <th className="p-4 text-xs font-bold text-slate-500">實領薪資</th>
                  <th className="p-4 text-xs font-bold text-slate-500">備註</th>
                  <th className="p-4 text-xs font-bold text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth)).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-sm font-medium">{record.date}</td>
                    <td className="p-4 text-sm">{record.regularHours}h</td>
                    <td className="p-4 text-sm text-orange-500 font-medium">
                       {record.overtime1}h / {record.overtime2}h
                    </td>
                    <td className="p-4 text-sm font-bold text-orange-600">{record.overtimeTotal}h</td>
                    <td className="p-4 text-sm font-bold text-emerald-600">NT$ {Number(record.salary).toLocaleString()}</td>
                    <td className="p-4">
                      {record.note && (
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          record.note.includes('病假') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>{record.note}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button onClick={() => {setDeleteTarget(record); setShowDeleteModal(true)}} className="p-2 text-slate-400 hover:text-red-500">
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

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-2">確定刪除？</h3>
            <p className="text-slate-500 mb-6">日期：{deleteTarget?.date}</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-500 text-white rounded-xl">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full mx-4 text-center">
            <h3 className="text-lg font-bold mb-4">匯出報表</h3>
            <p className="mb-6 text-slate-500">即將匯出 {filterMonth === 'all' ? '全部' : filterMonth} 的資料為 CSV 格式。</p>
            <div className="space-y-3">
              <button onClick={exportToCSV} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <Table size={20} /> 下載 CSV 檔案
              </button>
              <button onClick={() => setShowExportModal(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, type, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" />
  </div>
);

export default SalaryTracker;
