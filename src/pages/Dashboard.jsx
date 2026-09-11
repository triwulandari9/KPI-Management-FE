import { useState, useEffect } from "react";
import {
  FaClipboardList,
  FaFolderOpen,
  FaCheckCircle,
  FaRegClock,
  FaShieldAlt,
  FaCheck,
  FaEdit,
  FaTrashAlt,
  FaTimes,
  FaCalendarAlt,
  FaStar,
  FaUsers,
  FaLaptopCode,
  FaSpinner,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import PageHeader from "../layouts/PageHeader";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboardService";

// Nilai Poin Standar Sesuai Catatan Mentor / ClickUp
const SP_OPTIONS = [1, 2, 3, 4, 5, 8, 12, 16, 18, 20, 28, 241];

const STATUS_CONFIG = {
  Backlog: { bg: "bg-gray-100 text-gray-700 border-gray-200" },
  Ready: { bg: "bg-blue-50 text-blue-600 border-blue-200" },
  "On Progress": { bg: "bg-amber-50 text-amber-600 border-amber-200" },
  "Code Review": { bg: "bg-purple-50 text-purple-600 border-purple-200" },
  QA: { bg: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  Done: { bg: "bg-green-50 text-green-600 border-green-200" },
};

export default function Dashboard() {
  const { collapsed } = useSidebar();
  const { currentUser } = useAuth();
  const isHR = currentUser?.role?.toUpperCase() === "HR";
  const userName = currentUser?.name || (isHR ? "Admin HR" : "Sari");

  const [taskList, setTaskList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const tasks = await dashboardService.getDashboardTasks({
          startDate,
          endDate,
          isHR,
          userName,
        });
        if (isMounted && tasks) {
          setTaskList(tasks);
        }
      } catch (err) {
        console.error("Gagal load data dashboard:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, isHR, userName]);

  const displayedTasks = isHR
    ? taskList
    : taskList.filter((t) => t.assignee.toLowerCase().includes("sari") || t.assignee.toLowerCase().includes(userName.toLowerCase()));

  const totalTasks = displayedTasks.length;
  const backlogCount = displayedTasks.filter((t) => t.status === "Backlog").length;
  const readyCount = displayedTasks.filter((t) => t.status === "Ready").length;
  const onProgressCount = displayedTasks.filter((t) => t.status === "On Progress").length;
  const qaCount = displayedTasks.filter((t) => t.status === "QA").length;
  const doneCount = displayedTasks.filter((t) => t.status === "Done").length;
  const totalPoints = displayedTasks.reduce((acc, curr) => acc + (Number(curr.point) || 0), 0);

  const statCards = [
    { title: "Total Task", value: totalTasks, sub: isHR ? "Semua Tim" : "Tugas Saya", icon: <FaClipboardList />, bg: "bg-accent-light", color: "text-accent" },
    { title: "Backlog", value: backlogCount, sub: "Tasks", icon: <FaFolderOpen />, bg: "bg-orange-50", color: "text-orange-500" },
    { title: "Ready", value: readyCount, sub: "Tasks", icon: <FaCheckCircle />, bg: "bg-blue-50", color: "text-blue-500" },
    { title: "On Progress", value: onProgressCount, sub: "Tasks", icon: <FaRegClock />, bg: "bg-amber-50", color: "text-amber-500" },
    { title: "QA", value: qaCount, sub: "Tasks", icon: <FaShieldAlt />, bg: "bg-purple-50", color: "text-purple-500" },
    { title: "Done", value: doneCount, sub: "Tasks", icon: <FaCheck />, bg: "bg-green-50", color: "text-green-500" },
  ];

  const handleDeleteTask = async (id) => {
    try {
      await dashboardService.deleteDashboardTask(id);
      setTaskList((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Gagal menghapus task:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await dashboardService.updateDashboardTask(editingTask.id, editingTask);
      setTaskList((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...editingTask } : t))
      );
    } catch (err) {
      console.error("Gagal menyimpan task:", err);
    } finally {
      setEditingTask(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Sidebar />

      <main className={`transition-all duration-300 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <PageHeader
          title={isHR ? "Dashboard Admin HR" : "Dashboard Karyawan"}
          subtitle={`Welcome back, ${userName}! • Ringkasan aktivitas dan capaian kinerja sprint`}
        >
          {isHR && (
            <span className="bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <FaUsers size={12} /> Mode HR: Melihat Keseluruhan Tim
            </span>
          )}
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Stat cards */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {statCards.map((card) => (
              <div key={card.title} className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-gray-100 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg shrink-0 ${card.bg} ${card.color}`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-gray-400 font-medium truncate">{card.title}</p>
                  <p className="text-lg sm:text-xl font-extrabold text-gray-800">{card.value}</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total Point card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-100 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 text-sm">Total Point Sprint</h3>
                <span className="text-[10px] bg-accent-light text-accent font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  {startDate} – {endDate}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Akumulasi Point:</span>
              <span className="inline-block bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
                {totalPoints} Point SP
              </span>
            </div>
          </div>
        </div>

        {/* Task list section */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
            <h3 className="font-bold text-gray-800 text-base">
              {isHR ? "Daftar Task Seluruh Tim" : "Riwayat Tugas & Progres Saya"}
            </h3>
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                  <FaSpinner className="animate-spin" size={11} /> Sinkronisasi API...
                </span>
              )}
              <span className="text-xs text-gray-400">Total: {displayedTasks.length} Tugas</span>
            </div>
          </div>

          {displayedTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100 text-sm">
              Tidak ada task yang tersisa.
            </div>
          ) : (
            displayedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
              >
                {/* Info Utama Task */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-accent-light flex items-center justify-center text-accent shrink-0 mt-0.5 sm:mt-0">
                    <FaLaptopCode size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-400 font-mono">{task.id}</span>
                      <h4 className="font-bold text-gray-800 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">{task.title}</h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-accent-light text-accent border border-accent/20 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {task.point ?? 0} Point
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Assign: <span className="font-semibold text-gray-600">{task.assignee}</span></p>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-gray-50 text-xs">
                  <div>
                    <p className="text-gray-400 text-[10px] font-medium">Start Date</p>
                    <p className="text-gray-700 font-semibold">{task.start}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-[10px] font-medium">Deadline</p>
                    <p className="text-gray-700 font-semibold">{task.deadline}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-[10px] font-medium mb-0.5">Status Tugas</p>
                    <span className={`inline-flex items-center justify-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shadow-2xs ${STATUS_CONFIG[task.status]?.bg || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {task.status}
                    </span>
                  </div>

                  {/* Action Buttons: Khusus HR */}
                  {isHR ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                      <button
                        onClick={() => setEditingTask({ ...task })}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                        title="Ubah data & poin task (Mode HR)"
                      >
                        <FaEdit size={11} className="text-primary" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(task.id)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold border border-red-200 bg-red-50/50 rounded-xl px-3 py-1.5 text-red-600 hover:bg-red-100/70 transition-all cursor-pointer"
                        title="Hapus task (Mode HR)"
                      >
                        <FaTrashAlt size={11} /> Delete
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200/60 font-medium">
                      Riwayat Tugas
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL: Edit Task */}
        {editingTask && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                    <FaEdit />
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-gray-800">Edit Task</h3>
                    <p className="text-xs text-gray-400 font-mono">{editingTask.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTask(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-4 flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Tugas</label>
                  <input
                    type="text"
                    required
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editingTask.start}
                      onChange={(e) => setEditingTask({ ...editingTask, start: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={editingTask.deadline}
                      onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>
                </div>

                {/* Pilihan Story Points Standar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      Story Points (SP) Standar:
                    </label>
                    <span className="text-[11px] font-bold text-accent bg-accent-light px-2 py-0.5 rounded-full">
                      {editingTask.point} SP Terpilih
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-2">
                    {SP_OPTIONS.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setEditingTask({ ...editingTask, point: sp })}
                        className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${editingTask.point === sp
                            ? "bg-accent text-white border-accent shadow-xs scale-105"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                      >
                        {sp} SP
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status Tugas</label>
                    <select
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="Backlog">Backlog</option>
                      <option value="Ready">Ready</option>
                      <option value="On Progress">On Progress</option>
                      <option value="Code Review">Code Review</option>
                      <option value="QA">QA</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
                    <input
                      type="text"
                      value={editingTask.assignee}
                      onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Konfirmasi Hapus Task */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-lg">
                <FaTrashAlt />
              </div>
              <h3 className="font-bold text-base text-gray-900 mb-1">Hapus Tugas Ini?</h3>
              <p className="text-xs text-gray-500 mb-5">
                Tugas <span className="font-semibold text-gray-800">{deleteConfirmId}</span> akan dihapus dari daftar dashboard.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteTask(deleteConfirmId)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}