import { useState, useEffect } from "react";
import {
  FaPlus,
  FaFilter,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimes,
  FaThLarge,
  FaListUl,
  FaExclamationTriangle,
  FaBug,
  FaCode,
  FaTools,
  FaRedoAlt,
  FaUserCircle,
  FaStar,
  FaEdit,
  FaLightbulb,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import PageHeader from "../layouts/PageHeader";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService";

// Nilai Poin Standar Sesuai Catatan Mentor / ClickUp
const SP_OPTIONS = [1, 2, 3, 4, 5, 8, 12, 16, 18, 20, 28, 241];

// Status alur kerja ala ClickUp
const STATUSES = [
  { id: "Backlog", label: "Backlog", color: "bg-gray-100 text-gray-700 border-gray-300", dot: "bg-gray-400" },
  { id: "Ready", label: "Ready", color: "bg-blue-50 text-blue-600 border-blue-200", dot: "bg-blue-500" },
  { id: "On Progress", label: "On Progress", color: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  { id: "Code Review", label: "Code Review", color: "bg-purple-50 text-purple-600 border-purple-200", dot: "bg-purple-500" },
  { id: "QA", label: "QA (Quality Assurance)", color: "bg-indigo-50 text-indigo-600 border-indigo-200", dot: "bg-indigo-500" },
  { id: "Done", label: "Done", color: "bg-green-50 text-green-600 border-green-200", dot: "bg-green-500" },
];

const CATEGORY_BADGES = {
  Feature: { label: "Feature", bg: "bg-blue-50 text-blue-600 border-blue-200", icon: <FaCode size={11} /> },
  "Bug Ticket": { label: "Ticket Bug (CH)", bg: "bg-red-50 text-red-600 border-red-200", icon: <FaBug size={11} /> },
  "Tech Debt": { label: "Tech Debt", bg: "bg-orange-50 text-orange-600 border-orange-200", icon: <FaTools size={11} /> },
  Improvement: { label: "Improvement", bg: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: <FaTools size={11} /> },
};

export default function Tasks() {
  const { collapsed } = useSidebar();
  const { currentUser } = useAuth();
  const isHR = currentUser?.role?.toUpperCase() === "HR";

  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskForPoint, setSelectedTaskForPoint] = useState(null);
  const [inputPoint, setInputPoint] = useState(5);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // State Form Tambah Task (Sebagai Karyawan - TIDAK ADA input Point)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Feature",
    assignee: "Sari",
    start: "",
    deadline: "",
    sla: "48 Jam",
    status: "Backlog",
  });

  useEffect(() => {
    let isMounted = true;
    async function loadTasks() {
      try {
        const data = await taskService.getTasks();
        if (isMounted && data) {
          setTasks(data);
        }
      } catch (err) {
        console.error("Gagal load data tasks:", err);
      }
    }
    loadTasks();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTasks = tasks.filter((task) => {
    return selectedCategory === "All" || task.category === selectedCategory;
  });

  const handleSavePoint = async (e) => {
    e.preventDefault();
    if (!selectedTaskForPoint) return;

    try {
      await taskService.updateTaskPoint(selectedTaskForPoint.id, inputPoint);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTaskForPoint.id ? { ...t, point: Number(inputPoint) } : t
        )
      );
    } catch (err) {
      console.error("Gagal menyimpan poin:", err);
    } finally {
      setSelectedTaskForPoint(null);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (colId) => {
    setDragOverColumn(colId);
  };

  const handleDragLeave = (colId) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      handleStatusChange(taskId, targetStatus);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const created = await taskService.createTask(newTask);
      setTasks((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        category: "Feature",
        assignee: "Sari",
        start: "",
        deadline: "",
        sla: "48 Jam",
        status: "Backlog",
      });
    } catch (err) {
      console.error("Gagal membuat task baru:", err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error("Gagal mengubah status task:", err);
    }
  };

  const handleRejectQA = async (taskId) => {
    try {
      await taskService.rejectTaskQA(taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: "On Progress",
                backwardCount: (t.backwardCount || 0) + 1,
              }
            : t
        )
      );
    } catch (err) {
      console.error("Gagal reject QA:", err);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Sidebar />

      <main className={`transition-all duration-300 pt-16 p-4 sm:p-6 lg:p-8 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {/* Page Header */}
        <PageHeader title="Task Management" subtitle="Kelola dan pantau alur tugas sprint harian tim pengembang">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
          >
            <FaPlus size={12} /> Tambah Task Baru
          </button>
        </PageHeader>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Filter Category */}
          <div className="flex items-center gap-2 justify-between sm:justify-start">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Filter Kategori:</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 transition-colors flex-1 sm:flex-initial">
              <FaFilter className="text-gray-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent focus:outline-none font-medium cursor-pointer w-full"
              >
                <option value="All">Semua Kategori</option>
                <option value="Feature">Feature (Fitur)</option>
                <option value="Bug Ticket">Ticket Bug (CH)</option>
                <option value="Tech Debt">Tech Debt</option>
                <option value="Improvement">Continuous Improvement</option>
              </select>
            </div>
          </div>

          {/* Switch View Mode: Kanban vs List */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban" ? "bg-white text-primary shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FaThLarge size={12} /> Board Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list" ? "bg-white text-primary shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FaListUl size={12} /> List View
            </button>
          </div>
        </div>

        {/* View Mode: KANBAN BOARD */}
        {viewMode === "kanban" && (
          <div className="overflow-x-auto pb-6 -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex xl:grid xl:grid-cols-6 gap-3.5 items-start">
              {STATUSES.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);
                const isOver = dragOverColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(col.id)}
                    onDragLeave={() => handleDragLeave(col.id)}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`rounded-2xl p-3 border transition-all duration-200 flex flex-col min-h-[420px] sm:min-h-[520px] w-[280px] sm:w-[320px] xl:w-auto shrink-0 xl:shrink ${
                      isOver
                        ? "bg-primary-light/50 border-primary border-2 border-dashed shadow-md"
                        : "bg-gray-100/70 border-gray-200/70"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-gray-800">{col.label}</h3>
                      </div>
                      <span className="text-[11px] font-semibold bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 shadow-2xs">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task Cards Container */}
                    <div className="flex flex-col gap-2.5 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="h-28 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center p-3">
                          {isOver ? "Lepaskan task di sini" : "Tidak ada task"}
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className="bg-white rounded-xl p-3.5 border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2 group relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-mono">{task.id}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  CATEGORY_BADGES[task.category]?.bg || "bg-gray-50 text-gray-700 border-gray-200"
                                }`}
                              >
                                {task.category}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-gray-800 group-hover:text-primary transition-colors leading-snug">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Info Deadline & SP Point */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                              <span className="flex items-center gap-1 text-[10px]">
                                <FaCalendarAlt className="text-gray-400" size={10} /> {task.deadline}
                              </span>

                              {/* Badge Poin (Bisa diklik khusus HR/PO untuk atur nilai poin) */}
                              {isHR ? (
                                <button
                                  onClick={() => handleOpenPointModal(task)}
                                  className="flex items-center gap-1 font-bold text-[10px] bg-accent-light text-accent hover:bg-accent hover:text-white px-2.5 py-0.5 rounded-full border border-accent/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
                                  title="Klik untuk ubah poin task (Mode HR/PO)"
                                >
                                  <FaStar size={9} /> {task.point ?? 0} SP
                                </button>
                              ) : (
                                <span className="font-bold text-[10px] bg-accent-light text-accent px-2.5 py-0.5 rounded-full border border-accent/20 whitespace-nowrap shrink-0">
                                  {task.point ?? 0} SP
                                </span>
                              )}
                            </div>

                            {/* Assignee Footer & Quick Status Picker */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
                                  {task.assignee.charAt(0)}
                                </div>
                                <span className="text-[11px] font-medium text-gray-600 truncate max-w-[80px]">
                                  {task.assignee}
                                </span>
                              </div>

                              {/* Dropdown pemindah status cepat */}
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className="text-[10px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                              >
                                {STATUSES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Tombol Aksi Khusus jika berada di QA */}
                            {task.status === "QA" && (
                              <div className="pt-1 flex gap-1.5 border-t border-gray-50">
                                <button
                                  onClick={() => handleRejectQA(task.id)}
                                  className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 p-1 rounded-lg border border-red-200 cursor-pointer"
                                  title="Kembalikan task ke Developer karena ada temuan bug"
                                >
                                  <FaExclamationTriangle size={9} /> Reject Bug
                                </button>
                                <button
                                  onClick={() => handleStatusChange(task.id, "Done")}
                                  className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold bg-green-50 text-green-600 hover:bg-green-100 p-1 rounded-lg border border-green-200 cursor-pointer"
                                >
                                  <FaCheckCircle size={9} /> Lolos Done
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: LIST VIEW */}
        {viewMode === "list" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[920px]">
                <thead className="bg-gray-50/90 border-b border-gray-100 text-gray-500 font-semibold">
                  <tr>
                    <th className="p-4 min-w-[220px]">ID & Judul Task</th>
                    <th className="p-4 whitespace-nowrap min-w-[130px]">Kategori</th>
                    <th className="p-4 whitespace-nowrap min-w-[120px]">Assignee</th>
                    <th className="p-4 whitespace-nowrap min-w-[130px]">SLA / Deadline</th>
                    <th className="p-4 whitespace-nowrap min-w-[110px] text-center">Point (PO)</th>
                    <th className="p-4 whitespace-nowrap min-w-[130px] text-center">Status</th>
                    <th className="p-4 whitespace-nowrap min-w-[130px] text-center">Aksi Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4">
                        <span className="text-[10px] text-gray-400 font-mono block">{task.id}</span>
                        <p className="font-bold text-gray-800 text-sm mt-0.5">{task.title}</p>
                        <p className="text-gray-400 text-xs line-clamp-1">{task.description}</p>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shadow-2xs ${
                            CATEGORY_BADGES[task.category]?.bg || "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {CATEGORY_BADGES[task.category]?.icon}
                          {task.category}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-gray-800 whitespace-nowrap">{task.assignee}</td>
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-medium text-gray-700">{task.deadline}</p>
                        <span className="text-[10px] text-gray-400">SLA: {task.sla}</span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {isHR ? (
                          <button
                            onClick={() => handleOpenPointModal(task)}
                            className="inline-flex items-center justify-center gap-1 font-bold text-xs bg-accent-light text-accent hover:bg-accent hover:text-white px-3 py-1 rounded-full border border-accent/30 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                            title="Atur Poin Task"
                          >
                            <FaStar size={10} /> {task.point ?? 0} SP
                          </button>
                        ) : (
                          <span className="inline-flex items-center justify-center font-bold text-xs bg-accent-light text-accent px-3 py-1 rounded-full border border-accent/20 whitespace-nowrap shadow-2xs">
                            {task.point ?? 0} SP
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center text-[11px] font-semibold px-3 py-1 rounded-full border whitespace-nowrap shadow-2xs ${
                            STATUSES.find((s) => s.id === task.status)?.color || "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: Tambah Task Baru (Karyawan - Tanpa Input Point) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Tambah Task Baru</h3>
                  <p className="text-xs text-gray-400">Buat tugas baru untuk tim pengembang</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="mt-4 flex flex-col gap-4">
                {/* Judul Task */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Judul Task <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Integrasi API Payment Gateway"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi & Catatan</label>
                  <textarea
                    rows="3"
                    placeholder="Tuliskan rincian pengerjaan atau kendala tiket..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  ></textarea>
                </div>

                {/* Kategori & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori Task</label>
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="Feature">Feature (Fitur Utama)</option>
                      <option value="Bug Ticket">Ticket Bug (Dari CH)</option>
                      <option value="Tech Debt">Tech Debt (Hutang Teknis)</option>
                      <option value="Improvement">Continuous Improvement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="Sari">Sari (Frontend)</option>
                      <option value="Musa">Musa (Backend)</option>
                      <option value="Mitha">Mitha (UI/UX)</option>
                    </select>
                  </div>
                </div>

                {/* Tanggal & SLA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Deadline</label>
                    <input
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target SLA</label>
                    <select
                      value={newTask.sla}
                      onChange={(e) => setNewTask({ ...newTask, sla: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="24 Jam">24 Jam (Bug Urgent)</option>
                      <option value="48 Jam">48 Jam (Normal SLA)</option>
                      <option value="72 Jam">72 Jam</option>
                      <option value="1 Minggu">1 Minggu (Feature)</option>
                    </select>
                  </div>
                </div>

                {/* Info Catatan tentang Poin */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700 flex items-start gap-2.5">
                  <FaLightbulb className="text-blue-600 shrink-0 text-sm mt-0.5" />
                  <span>
                    <b>Pemberian Poin (Story Points):</b> Poin untuk task ini akan dinilai dan ditentukan langsung oleh <b>Product Owner (PO) / HR</b> setelah task dibuat.
                  </span>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer"
                  >
                    Simpan Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* MODAL: Atur Poin Task (Khusus HR/PO) */}
        {selectedTaskForPoint && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-accent-light text-accent flex items-center justify-center font-bold text-sm">
                    SP
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-gray-800">Atur Poin Task (Mode HR/PO)</h3>
                    <p className="text-xs text-gray-400 font-mono">{selectedTaskForPoint.id} • {selectedTaskForPoint.assignee}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTaskForPoint(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSavePoint} className="mt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Judul Tugas:</p>
                  <p className="text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                    {selectedTaskForPoint.title}
                  </p>
                </div>

                {/* Pilihan Story Points Standar ClickUp */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Pilih Story Point (SP):
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {SP_OPTIONS.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setInputPoint(sp)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          inputPoint === sp
                            ? "bg-accent text-white border-accent shadow-xs scale-105"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {sp} SP
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Custom Point */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Atau Ketik Nilai Poin Kustom:</label>
                  <input
                    type="number"
                    min="1"
                    value={inputPoint}
                    onChange={(e) => setInputPoint(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskForPoint(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent hover:opacity-90 text-white shadow-sm cursor-pointer"
                  >
                    Simpan Poin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
