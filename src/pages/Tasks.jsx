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
  FaChevronDown,
  FaInbox,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import PageHeader from "../layouts/PageHeader";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService";
import { employeeService } from "../services/employeeService";

// Nilai Poin Standar Sesuai Catatan Mentor / ClickUp
const SP_OPTIONS = [1, 2, 3, 4, 5, 8, 12, 16, 18, 20, 28, 241];

// Status alur kerja ala ClickUp
const STATUSES = [
  { id: "Backlog", label: "Backlog", color: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400", borderTop: "border-t-slate-400" },
  { id: "Ready", label: "Ready", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", borderTop: "border-t-sky-500" },
  { id: "On Progress", label: "On Progress", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", borderTop: "border-t-amber-500" },
  { id: "Code Review", label: "Code Review", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", borderTop: "border-t-purple-500" },
  { id: "QA", label: "QA Review", color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", borderTop: "border-t-indigo-500" },
  { id: "Done", label: "Done", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", borderTop: "border-t-emerald-500" },
];

const CATEGORY_BADGES = {
  Feature: { label: "Feature", bg: "bg-blue-50 text-blue-700 border-blue-200/80", icon: <FaCode size={11} /> },
  "Bug Ticket": { label: "Bug Ticket", bg: "bg-rose-50 text-rose-700 border-rose-200/80", icon: <FaBug size={11} /> },
  "Tech Debt": { label: "Tech Debt", bg: "bg-orange-50 text-orange-700 border-orange-200/80", icon: <FaTools size={11} /> },
  Improvement: { label: "Improvement", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: <FaLightbulb size={11} /> },
};

export default function Tasks() {
  const { collapsed } = useSidebar();
  const { currentUser } = useAuth();
  const isHR = currentUser?.role?.toUpperCase() === "HR";

  // Normalisasi nama dari backend (bisa ALL CAPS) menjadi Title Case
  const formatName = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
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
    async function loadData() {
      try {
        const [tasksData, employeesData] = await Promise.all([
          taskService.getTasks().catch(() => []),
          employeeService.getEmployees().catch(() => []),
        ]);
        if (isMounted) {
          if (tasksData && Array.isArray(tasksData)) {
            setTasks(tasksData);
          }
          if (employeesData && Array.isArray(employeesData) && employeesData.length > 0) {
            setEmployees(employeesData);
            const firstEmpName = formatName(employeesData[0]?.name || employeesData[0]?.username);
            if (firstEmpName) {
              setNewTask((prev) => ({
                ...prev,
                assignee: prev.assignee || firstEmpName,
              }));
            }
          }
        }
      } catch (err) {
        console.error("Gagal load data tasks & employees:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const userCanSee = (task) => {
    if (isHR) return true;
    const isCreator = task.creator && task.creator === currentUser?.id;
    const isAssignee = task.assignee && task.assignee === currentUser?.username;
    return isCreator || isAssignee;
  };

  const filteredTasks = tasks
    .filter(userCanSee)
    .filter((task) => selectedCategory === "All" || task.category === selectedCategory);


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
      const created = await taskService.createTask({ ...newTask, creator: currentUser?.id });
      setTasks((prev) => [created, ...prev]);
      setIsModalOpen(false);
      const defaultAssignee = employees.length > 0
        ? formatName(employees[0].name || employees[0].username)
        : "Sari";
      setNewTask({
        title: "",
        description: "",
        category: "Feature",
        assignee: defaultAssignee,
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

  const handleOpenPointModal = (task) => {
    setSelectedTaskForPoint(task);
    setInputPoint(task.point ?? 5);
  };

  const formatTaskId = (id) => {
    if (!id) return "#TASK";
    const str = String(id);
    if (str.length > 6) {
      return `#${str.slice(-4).toUpperCase()}`;
    }
    return `#${str.toUpperCase()}`;
  };

  const getAssigneeInfo = (assigneeName) => {
    const formatted = formatName(assigneeName) || "Unassigned";
    const matchedEmp = employees.find(
      (e) =>
        formatName(e.name || e.username).toLowerCase() === formatted.toLowerCase() ||
        (e.name && e.name.toLowerCase().includes(formatted.toLowerCase())) ||
        (e.username && e.username.toLowerCase().includes(formatted.toLowerCase()))
    );
    return {
      name: formatted,
      avatar:
        matchedEmp?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(formatted)}&background=0284c7&color=fff&bold=true&size=64`,
      role: matchedEmp?.position || matchedEmp?.role || "Developer",
    };
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Sidebar />

      <main className={`transition-all duration-300 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
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
          <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            <div className="flex gap-4 items-start min-w-max pb-2">
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
                    className={`rounded-2xl p-3.5 border transition-all duration-200 flex flex-col min-h-[460px] w-[285px] sm:w-[305px] shrink-0 border-t-4 ${col.borderTop || "border-t-primary"} ${
                      isOver
                        ? "bg-primary-light/40 border-primary border-dashed shadow-md"
                        : "bg-slate-100/70 border-slate-200/80"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shrink-0 ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-gray-800 whitespace-nowrap uppercase tracking-wider">{col.label}</h3>
                      </div>
                      <span className="text-[11px] font-bold bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 shadow-2xs shrink-0">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task Cards Container */}
                    <div className="flex flex-col gap-3 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="h-32 rounded-xl border-2 border-dashed border-gray-200/80 flex flex-col items-center justify-center gap-1.5 text-gray-400 text-xs text-center p-3 bg-white/40">
                          <FaInbox className="text-gray-300" size={20} />
                          <span className="text-[11px] font-medium">{isOver ? "Lepaskan task di sini" : "Tidak ada task"}</span>
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const assigneeInfo = getAssigneeInfo(task.assignee);
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-2.5 group relative"
                            >
                              {/* Top Meta: ID & Kategori Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
                                  {formatTaskId(task.id)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 shadow-2xs ${
                                    CATEGORY_BADGES[task.category]?.bg || "bg-gray-50 text-gray-700 border-gray-200"
                                  }`}
                                >
                                  {CATEGORY_BADGES[task.category]?.icon}
                                  {CATEGORY_BADGES[task.category]?.label || task.category}
                                </span>
                              </div>

                              {/* Judul & Deskripsi */}
                              <div>
                                <h4 className="text-[13px] font-bold text-gray-800 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mt-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Info Deadline & SP Point */}
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                  <FaCalendarAlt className="text-gray-400" size={10} /> {task.deadline || "Tanpa deadline"}
                                </span>

                                {/* Badge Poin (Bisa diklik khusus HR/PO untuk atur nilai poin) */}
                                {isHR ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPointModal(task);
                                    }}
                                    className="inline-flex items-center gap-1 font-bold text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200/80 transition-all cursor-pointer shadow-2xs"
                                    title="Klik untuk ubah poin task (Mode HR/PO)"
                                  >
                                    <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200/60 shadow-2xs">
                                    <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                                  </span>
                                )}
                              </div>

                              {/* Assignee Footer & Quick Status Picker */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100/80">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <img
                                    src={assigneeInfo.avatar}
                                    alt={assigneeInfo.name}
                                    className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                                    onError={(e) => {
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee)}&background=0284c7&color=fff&bold=true&size=64`;
                                    }}
                                  />
                                  <span className="text-[11px] font-semibold text-gray-700 truncate">
                                    {assigneeInfo.name}
                                  </span>
                                </div>

                                {/* Dropdown pemindah status cepat */}
                                <div className="relative shrink-0">
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    className="text-[10px] font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg pl-2 pr-5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none shadow-2xs transition-colors"
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <FaChevronDown
                                    size={7}
                                    className="text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                  />
                                </div>
                              </div>

                              {/* Tombol Aksi Khusus jika berada di QA */}
                              {task.status === "QA" && (
                                <div className="pt-2 flex gap-1.5 border-t border-gray-100">
                                  <button
                                    onClick={() => handleRejectQA(task.id)}
                                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 py-1.5 px-2 rounded-xl border border-red-200/80 cursor-pointer shadow-2xs transition-colors"
                                    title="Kembalikan task ke Developer karena ada temuan bug"
                                  >
                                    <FaExclamationTriangle size={9} /> Reject Bug
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(task.id, "Done")}
                                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-1.5 px-2 rounded-xl border border-emerald-200/80 cursor-pointer shadow-2xs transition-colors"
                                  >
                                    <FaCheckCircle size={10} /> Lolos Done
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
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
                <thead className="bg-gray-50/90 border-b border-gray-100 text-gray-500 font-semibold sticky top-0 z-10">
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
                  {filteredTasks.map((task) => {
                    const assigneeInfo = getAssigneeInfo(task.assignee);
                    return (
                      <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-4">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 inline-block mb-1">
                            {formatTaskId(task.id)}
                          </span>
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
                            {CATEGORY_BADGES[task.category]?.label || task.category}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-gray-800 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <img
                              src={assigneeInfo.avatar}
                              alt={assigneeInfo.name}
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee)}&background=0284c7&color=fff&bold=true&size=64`;
                              }}
                            />
                            <span>{assigneeInfo.name}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-medium text-gray-700">{task.deadline || "-"}</p>
                          <span className="text-[10px] text-gray-400">SLA: {task.sla || "48 Jam"}</span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {isHR ? (
                            <button
                              onClick={() => handleOpenPointModal(task)}
                              className="inline-flex items-center justify-center gap-1 font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 px-3 py-1 rounded-full border border-amber-200/80 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                              title="Atur Poin Task"
                            >
                              <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center font-bold text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200/60 whitespace-nowrap shadow-2xs">
                              <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
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
                          <div className="relative inline-block">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className="text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl pl-2.5 pr-6 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs appearance-none transition-colors"
                            >
                              {STATUSES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <FaChevronDown
                              size={8}
                              className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Assignee <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                      required
                    >
                      {employees && employees.length > 0 ? (
                        employees.map((emp) => {
                          const formatted = formatName(emp.name || emp.username);
                          const roleName = emp.position || emp.role || "Developer";
                          return (
                            <option key={emp._id || emp.id} value={formatted}>
                              {formatted} ({roleName})
                            </option>
                          );
                        })
                      ) : (
                        <>
                          <option value="Sari">Sari (Frontend Developer)</option>
                          <option value="Musa">Musa (Backend Developer)</option>
                          <option value="Mitha">Mitha (UI/UX Designer)</option>
                        </>
                      )}
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
