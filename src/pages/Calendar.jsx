import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
  FaTimes,
  FaCheckCircle,
  FaFilter,
  FaPlus,
  FaSpinner,
  FaCode,
  FaBug,
  FaTools,
  FaLightbulb,
  FaSearch,
  FaLayerGroup,
  FaExternalLinkAlt,
  FaTasks,
  FaExclamationCircle,
  FaCalendarCheck,
  FaUser,
  FaHistory,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService";
import { calendarService } from "../services/calendarService";
import { employeeService } from "../services/employeeService";
import LinearLoading from "../components/LinearLoading";

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Kategori styling & icon
const CATEGORY_CONFIG = {
  Feature: {
    label: "Feature",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    chip: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    icon: <FaCode size={10} className="shrink-0 text-blue-600" />,
  },
  "Bug Ticket": {
    label: "Bug Ticket",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    chip: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
    icon: <FaBug size={10} className="shrink-0 text-rose-600" />,
  },
  "Tech Debt": {
    label: "Tech Debt",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    chip: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    icon: <FaTools size={10} className="shrink-0 text-orange-600" />,
  },
  Improvement: {
    label: "Improvement",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    icon: <FaLightbulb size={10} className="shrink-0 text-emerald-600" />,
  },
};

// Status styling
const STATUS_CONFIG = {
  Backlog: { label: "Backlog", badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  Ready: { label: "Ready", badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  "On Progress": { label: "On Progress", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "Code Review": { label: "Code Review", badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  QA: { label: "QA Review", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  Done: { label: "Done", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

export default function CalendarPage() {
  const { collapsed } = useSidebar();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const realToday = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState("Month"); // "Month" | "Week" | "List"
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [teamFilter, setTeamFilter] = useState("All Teams");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [listScope, setListScope] = useState("month"); // "month" (hanya bulan terpilih) | "all" (semua riwayat tugas)

  // Data States
  const [tasks, setTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal States
  const [selectedTask, setSelectedTask] = useState(null);
  const [dayTasksModal, setDayTasksModal] = useState(null); // { date: Date, tasks: [] }

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Opsi pilihan tahun (historis & masa depan: 2023 s/d 2030)
  const yearOptions = useMemo(() => {
    const years = [];
    const base = realToday.getFullYear();
    for (let y = base - 3; y <= base + 4; y++) {
      years.push(y);
    }
    if (!years.includes(currentYear)) {
      years.push(currentYear);
      years.sort((a, b) => a - b);
    }
    return years;
  }, [currentYear, realToday]);

  const formatName = (input) => {
    if (!input) return "";
    let str = "";
    if (typeof input === "string") {
      str = input;
    } else if (typeof input === "object") {
      str = input.name || input.username || input.email || "";
    } else {
      str = String(input);
    }
    if (!str || typeof str !== "string") return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const currentUserName = formatName(currentUser?.name || currentUser?.username || "");
  const currentUserId = currentUser?._id || currentUser?.id;

  // Helper parsing tanggal
  const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === "string") {
      const parts = val.split("T")[0].split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  // Load Data Task, Calendar Events, & Employees
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [tasksRes, calRes, empRes] = await Promise.all([
          taskService.getTasks().catch(() => []),
          calendarService.getCalendarEvents({ month: currentMonth, year: currentYear }).catch(() => []),
          employeeService.getEmployees().catch(() => []),
        ]);

        if (isMounted) {
          if (Array.isArray(tasksRes)) setTasks(tasksRes);
          if (Array.isArray(calRes)) setCalendarEvents(calRes);
          if (Array.isArray(empRes)) setEmployees(empRes);
        }
      } catch (err) {
        console.error("Gagal load data kalender & tasks:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentMonth, currentYear]);

  // Gabungkan dan standarisasi data tasks & calendar events
  const unifiedTasks = useMemo(() => {
    const list = [];

    // 1. Masukkan semua Task dari taskService
    tasks.forEach((t) => {
      const deadlineDate = parseDate(t.deadline);
      const startDate = parseDate(t.start);

      let assigneeName = "Unassigned";
      if (t.assignee) {
        assigneeName = formatName(t.assignee);
      } else if (t.employee) {
        assigneeName = formatName(t.employee);
      }

      // Cari tim/departemen
      let team = t.team || t.department || "Engineering";
      const matchedEmp = employees.find(
        (emp) =>
          formatName(emp.name || emp.username).toLowerCase() === assigneeName.toLowerCase() ||
          (emp._id && String(emp._id) === String(t.assignee || t.employee))
      );
      if (matchedEmp && (matchedEmp.division || matchedEmp.department)) {
        team = matchedEmp.division || matchedEmp.department;
      }

      list.push({
        id: t._id || t.id || `task-${Math.random()}`,
        title: t.title || "Tugas Tanpa Judul",
        description: t.description || "",
        category: t.category || "Feature",
        assignee: assigneeName,
        assigneeRaw: t.assignee || t.employee,
        team: team,
        status: t.status || "Backlog",
        point: t.point ?? 5,
        sla: t.sla || "48 Jam",
        assignedBy: t.assignedBy || t.creatorName || "Manager",
        startDate: startDate,
        deadlineDate: deadlineDate,
        isTask: true,
      });
    });

    // 2. Masukkan agenda dari calendarService jika belum ada di tasks
    calendarEvents.forEach((evt) => {
      const isAlreadyInTasks = list.some((item) => item.id === evt.id || item.title === evt.title);
      if (!isAlreadyInTasks) {
        let evtDeadline = null;
        if (evt.year && evt.month !== undefined && evt.day) {
          evtDeadline = new Date(evt.year, evt.month, evt.day);
        } else if (evt.date) {
          evtDeadline = parseDate(evt.date);
        }

        list.push({
          id: evt.id || `evt-${Math.random()}`,
          title: evt.title || "Agenda",
          description: evt.description || "",
          category: evt.category || "Feature",
          assignee: formatName(evt.assignee) || "Unassigned",
          team: evt.team || "Umum",
          status: evt.status || "Ready",
          point: evt.point ?? 3,
          sla: evt.sla || "-",
          assignedBy: evt.assignedBy || "Admin",
          startDate: evt.startDate ? parseDate(evt.startDate) : evtDeadline,
          deadlineDate: evtDeadline,
          isTask: false,
        });
      }
    });

    return list;
  }, [tasks, calendarEvents, employees]);

  // Filter Tasks berdasarkan status, tim, kategori, pencarian, dan Tugas Saya
  const filteredTasks = useMemo(() => {
    return unifiedTasks.filter((task) => {
      // Filter Status
      if (statusFilter !== "All Statuses" && task.status !== statusFilter) return false;

      // Filter Tim
      if (teamFilter !== "All Teams" && task.team !== teamFilter) return false;

      // Filter Kategori
      if (categoryFilter !== "All Categories" && task.category !== categoryFilter) return false;

      // Filter Hanya Tugas Saya
      if (onlyMyTasks) {
        const isMyName = currentUserName && task.assignee.toLowerCase().includes(currentUserName.toLowerCase());
        const isMyId =
          currentUserId &&
          (task.assigneeRaw === currentUserId ||
            task.assigneeRaw?._id === currentUserId ||
            task.assigneeRaw?.id === currentUserId);
        if (!isMyName && !isMyId) return false;
      }

      // Filter Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description.toLowerCase().includes(q);
        const matchAssignee = task.assignee.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAssignee) return false;
      }

      return true;
    });
  }, [unifiedTasks, statusFilter, teamFilter, categoryFilter, onlyMyTasks, searchQuery, currentUserName, currentUserId]);

  // Handler Ganti Bulan & Tahun
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setCurrentDate(new Date(currentYear, newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentDate(new Date(newYear, currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper kalkulasi sel kalender (Bulan)
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);

  const calendarCells = [];

  // Sel bulan sebelumnya
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      dayNumber: daysInPrevMonth - i,
      isCurrentMonth: false,
      month: currentMonth - 1,
      year: currentYear,
    });
  }

  // Sel bulan aktif
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: true,
      month: currentMonth,
      year: currentYear,
    });
  }

  // Sel bulan berikutnya
  const remainingCells = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: false,
      month: currentMonth + 1,
      year: currentYear,
    });
  }

  // Mengecek apakah suatu task jatuh pada sel kalender tertentu (HANYA DI HARI DEADLINE)
  const getTasksForCell = (cell) => {
    const cellDate = new Date(cell.year, cell.month, cell.dayNumber);
    cellDate.setHours(0, 0, 0, 0);

    return filteredTasks.filter((task) => {
      const deadline = task.deadlineDate ? new Date(task.deadlineDate) : null;
      if (!deadline) return false;
      deadline.setHours(0, 0, 0, 0);
      return deadline.getTime() === cellDate.getTime();
    });
  };

  // Hitung jumlah tugas yang jatuh pada bulan dan tahun yang sedang dipilih (berdasarkan deadline)
  const tasksInSelectedMonth = useMemo(() => {
    return filteredTasks.filter((t) => {
      const deadline = t.deadlineDate ? new Date(t.deadlineDate) : null;
      if (!deadline) return false;
      return deadline.getMonth() === currentMonth && deadline.getFullYear() === currentYear;
    });
  }, [filteredTasks, currentMonth, currentYear]);

  // Filter khusus untuk mode List (Apakah hanya bulan terpilih atau semua riwayat)
  const listTasks = useMemo(() => {
    if (listScope === "all") {
      return filteredTasks;
    }
    return tasksInSelectedMonth;
  }, [filteredTasks, listScope, tasksInSelectedMonth]);

  return (
    <div className="bg-gray-50 min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      <Header />
      <Sidebar />

      <main
        className={`pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-4 flex-1 flex flex-col overflow-auto lg:overflow-hidden transition-all duration-300 ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* State Loading Linear Kalender */}
        {isLoading && (
          <div className="mb-2 shrink-0">
            <LinearLoading message="Memuat jadwal kalender dan deadline tugas sprint..." />
          </div>
        )}

        {/* Header Kalender & Filter Toolbar */}
        <div className="shrink-0 flex flex-col gap-3 mb-3 sm:mb-4">
          {/* Baris 1: Judul + Pemilih Bulan & Tahun Rapi + Navigasi */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-gray-200/80 shadow-2xs">
            {/* Bagian Kiri: Title & Selector Bulan & Tahun yang Proporsional */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-light text-primary hidden sm:inline-flex">
                  <FaCalendarAlt size={16} />
                </span>

                {/* Dropdown Pilihan Bulan (Font rapi & proporsional) */}
                <div className="relative">
                  <select
                    value={currentMonth}
                    onChange={handleMonthChange}
                    className="text-sm sm:text-base font-bold text-gray-900 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-all shadow-2xs appearance-none"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <FaChevronLeft className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none -rotate-90 text-[10px]" />
                </div>

                {/* Dropdown Pilihan Tahun */}
                <div className="relative">
                  <select
                    value={currentYear}
                    onChange={handleYearChange}
                    className="text-sm sm:text-base font-bold text-primary bg-primary-light/60 hover:bg-primary-light border border-primary/20 rounded-xl px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all shadow-2xs appearance-none"
                  >
                    {yearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <FaChevronLeft className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/70 pointer-events-none -rotate-90 text-[10px]" />
                </div>

                {/* Badge Total Tugas Dinamis Sesuai Bulan yang Dipilih */}
                <span className={`text-xs px-2.5 py-1 font-bold rounded-xl border transition-all ${
                  tasksInSelectedMonth.length > 0
                    ? "bg-primary-light text-primary border-primary/20"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }`}>
                  {tasksInSelectedMonth.length} Tugas
                </span>

                {isLoading && <FaSpinner className="animate-spin text-primary text-xs shrink-0" />}
              </div>
            </div>

            {/* Bagian Kanan: Tombol Navigasi Cepat (Hari Ini, Prev Month, Next Month) */}
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button
                onClick={handleToday}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="Kembali ke Bulan & Hari Ini"
              >
                <FaCalendarCheck className="text-primary text-[11px]" />
                Bulan Ini
              </button>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 text-gray-600 hover:bg-white hover:text-primary rounded-lg transition-all cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <FaChevronLeft size={11} />
                </button>
                <div className="h-4 w-[1px] bg-gray-200"></div>
                <button
                  onClick={handleNextMonth}
                  className="p-2 text-gray-600 hover:bg-white hover:text-primary rounded-lg transition-all cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <FaChevronRight size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Baris 2: View Switch + Filter & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Bagian Kiri: Mode Kalender + Toggle Tugas Saya + Display Mode */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Switch: Month | Week | List */}
              <div className="bg-gray-200/70 p-1 rounded-xl flex items-center shadow-inner">
                {["Month", "Week", "List"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewType(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewType === mode
                        ? "bg-white text-gray-900 shadow-xs border border-gray-200/60"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {mode === "Month" ? "Bulanan" : mode === "Week" ? "Mingguan" : "Daftar Tugas"}
                  </button>
                ))}
              </div>

              {/* Toggle Tugas Saya */}
              <button
                onClick={() => setOnlyMyTasks(!onlyMyTasks)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  onlyMyTasks
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-2xs"
                }`}
              >
                <FaUser className="text-[10px]" />
                Tugas Saya
              </button>

              {/* Toggle Scope pada List View: Bulan Ini vs Semua Riwayat */}
              {viewType === "List" && (
                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 text-xs font-medium shadow-2xs text-gray-600">
                  <button
                    onClick={() => setListScope("month")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                      listScope === "month" ? "bg-primary-light text-primary font-bold" : "hover:text-gray-900"
                    }`}
                  >
                    Bulan {MONTH_NAMES[currentMonth].slice(0, 3)} {currentYear}
                  </button>
                  <button
                    onClick={() => setListScope("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                      listScope === "all" ? "bg-primary-light text-primary font-bold" : "hover:text-gray-900"
                    }`}
                  >
                    <FaHistory size={10} /> Semua Riwayat
                  </button>
                </div>
              )}
            </div>

            {/* Bagian Kanan: Filter Dropdowns & Search */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {/* Search Box */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Cari tugas / assignee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-gray-700 placeholder-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light w-36 sm:w-44 shadow-2xs"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer shadow-2xs"
              >
                <option value="All Statuses">Semua Status</option>
                <option value="Backlog">Backlog</option>
                <option value="Ready">Ready</option>
                <option value="On Progress">On Progress</option>
                <option value="Code Review">Code Review</option>
                <option value="QA">QA</option>
                <option value="Done">Done</option>
              </select>

              {/* Kategori Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer shadow-2xs"
              >
                <option value="All Categories">Semua Kategori</option>
                <option value="Feature">Feature</option>
                <option value="Bug Ticket">Bug Ticket</option>
                <option value="Tech Debt">Tech Debt</option>
                <option value="Improvement">Improvement</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW MODE 1: MONTH (BULANAN)                              */}
        {/* ========================================================= */}
        {viewType === "Month" && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-sm overflow-x-auto min-h-[500px] lg:min-h-0">
            <div className="min-w-[700px] flex-1 flex flex-col h-full">
              {/* Header Hari: SUN s/d SAT */}
              <div className="shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50/75 text-center text-[10px] font-bold text-gray-500 py-2.5 tracking-wider uppercase">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              {/* Grid Sel Kalender Bulanan */}
              <div
                className="flex-1 grid grid-cols-7 divide-x divide-y divide-gray-100 min-h-0"
                style={{
                  gridTemplateRows: `repeat(${Math.ceil(calendarCells.length / 7)}, minmax(0, 1fr))`,
                }}
              >
                {calendarCells.map((cell, idx) => {
                  const isSelectedToday =
                    cell.isCurrentMonth &&
                    cell.dayNumber === realToday.getDate() &&
                    cell.month === realToday.getMonth() &&
                    cell.year === realToday.getFullYear();

                  const cellTasks = getTasksForCell(cell);
                  const maxVisible = 3;
                  const visibleTasks = cellTasks.slice(0, maxVisible);
                  const remainingCount = cellTasks.length - maxVisible;

                  return (
                    <div
                      key={idx}
                      className={`h-full p-1.5 flex flex-col justify-between overflow-hidden transition-colors ${
                        cell.isCurrentMonth ? "bg-white" : "bg-gray-50/40 text-gray-300"
                      } ${
                        isSelectedToday
                          ? "ring-2 ring-inset ring-accent bg-accent/5 rounded-xs"
                          : "hover:bg-gray-50/70"
                      }`}
                    >
                      {/* Baris Atas: Nomor Tanggal & Indikator Hari Ini */}
                      <div className="flex items-center justify-between shrink-0 mb-1">
                        {isSelectedToday ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5"></span>
                        ) : (
                          <span></span>
                        )}

                        <span
                          className={`text-[11px] font-semibold inline-flex items-center justify-center ${
                            isSelectedToday
                              ? "w-5 h-5 rounded-full bg-accent text-white font-bold text-[10px]"
                              : cell.isCurrentMonth
                              ? "text-gray-700 font-semibold"
                              : "text-gray-300"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                      </div>

                      {/* Daftar Badge Task di Tanggal Deadline Ini */}
                      <div className="flex flex-col gap-1 overflow-hidden my-auto">
                        {visibleTasks.map((t) => {
                          const catConf = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.Feature;

                          return (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className={`w-full text-left text-[9.5px] font-semibold px-1.5 py-1 rounded-lg border transition-all truncate cursor-pointer flex items-center gap-1 shadow-2xs ${catConf.chip}`}
                              title={`${t.title} (${t.assignee} - ${t.status})`}
                            >
                              {catConf.icon}
                              <span className="truncate flex-1">{t.title}</span>
                            </button>
                          );
                        })}

                        {/* Tombol jika ada task tersisa */}
                        {remainingCount > 0 && (
                          <button
                            onClick={() =>
                              setDayTasksModal({
                                date: new Date(cell.year, cell.month, cell.dayNumber),
                                tasks: cellTasks,
                              })
                            }
                            className="text-[9px] font-bold text-primary hover:text-primary-dark hover:underline text-left px-1 mt-0.5 cursor-pointer"
                          >
                            +{remainingCount} tugas lagi...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW MODE 2: WEEK (MINGGUAN)                              */}
        {/* ========================================================= */}
        {viewType === "Week" && (() => {
          const startOfWeek = new Date(currentYear, currentMonth, currentDate.getDate() - currentDate.getDay());
          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
            return {
              dateObj: d,
              dayName: DAYS_OF_WEEK[i],
              dayNumber: d.getDate(),
              monthName: MONTH_NAMES[d.getMonth()].slice(0, 3),
              month: d.getMonth(),
              year: d.getFullYear(),
              isToday:
                d.getDate() === realToday.getDate() &&
                d.getMonth() === realToday.getMonth() &&
                d.getFullYear() === realToday.getFullYear(),
            };
          });

          return (
            <div className="flex-1 flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-sm p-4 overflow-x-auto min-h-[500px] lg:min-h-0">
              <div className="min-w-[700px] flex-1 flex flex-col h-full">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">Tampilan Mingguan (Week View)</h3>
                    <p className="text-gray-400 text-xs">Daftar beban kerja dan task berjalan dalam 7 hari.</p>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2.5 flex-1 min-h-0">
                  {weekDays.map((wd) => {
                    const dayTasks = getTasksForCell({
                      year: wd.year,
                      month: wd.month,
                      dayNumber: wd.dayNumber,
                    });

                    return (
                      <div
                        key={wd.dayName}
                        className={`p-2.5 rounded-2xl border flex flex-col justify-between overflow-hidden transition-all ${
                          wd.isToday
                            ? "bg-accent/5 border-accent ring-1 ring-accent"
                            : "bg-gray-50/70 border-gray-200/70"
                        }`}
                      >
                        {/* Header Hari */}
                        <div className="pb-2 border-b border-gray-200/60 shrink-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs ${wd.isToday ? "text-accent" : "text-gray-700"}`}>
                              {wd.dayName}
                            </span>
                            {wd.isToday && (
                              <span className="text-[9px] bg-accent text-white font-bold px-1.5 py-0.5 rounded-full">
                                Hari Ini
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {wd.dayNumber} {wd.monthName}
                          </span>
                        </div>

                        {/* List Tugas di Hari Tersebut */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 my-2 pr-0.5">
                          {dayTasks.length === 0 ? (
                            <p className="text-[10px] text-gray-400 text-center py-4 italic">Tidak ada tugas</p>
                          ) : (
                            dayTasks.map((t) => {
                              const catConf = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.Feature;
                              const statConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.Backlog;
                              const isDeadline =
                                t.deadlineDate &&
                                t.deadlineDate.getDate() === wd.dayNumber &&
                                t.deadlineDate.getMonth() === wd.month;

                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTask(t)}
                                  className={`p-2 rounded-xl border text-left cursor-pointer transition-all hover:shadow-xs bg-white ${
                                    isDeadline ? "border-rose-300 ring-1 ring-rose-300/40" : "border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${catConf.badge}`}
                                    >
                                      {t.category}
                                    </span>
                                    {isDeadline && (
                                      <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                                        Deadline
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-snug">
                                    {t.title}
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-gray-100 text-[9.5px] text-gray-500">
                                    <span className="truncate">{t.assignee}</span>
                                    <span className={`w-2 h-2 rounded-full ${statConf.dot}`}></span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer Info Jumlah */}
                        <div className="text-[10px] font-semibold text-gray-400 text-right pt-1 shrink-0">
                          {dayTasks.length} Task
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* VIEW MODE 3: LIST VIEW (TABEL RINCIAN TUGAS)              */}
        {/* ========================================================= */}
        {viewType === "List" && (
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold tracking-wide">
                  <tr>
                    <th className="p-3.5 whitespace-nowrap">Tugas & Rincian</th>
                    <th className="p-3.5 whitespace-nowrap">Penanggung Jawab</th>
                    <th className="p-3.5 whitespace-nowrap">Divisi / Tim</th>
                    <th className="p-3.5 whitespace-nowrap">Kategori</th>
                    <th className="p-3.5 whitespace-nowrap">Timeline (Start - Deadline)</th>
                    <th className="p-3.5 whitespace-nowrap">Status</th>
                    <th className="p-3.5 whitespace-nowrap text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {listTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">
                        <FaTasks className="mx-auto text-2xl mb-2 text-gray-300" />
                        Tidak ada tugas yang sesuai pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    listTasks.map((t) => {
                      const catConf = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.Feature;
                      const statConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.Backlog;

                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                        >
                          <td className="p-3.5">
                            <p className="font-bold text-gray-900 text-xs">{t.title}</p>
                            {t.description && (
                              <p className="text-gray-400 text-[11px] line-clamp-1 mt-0.5">{t.description}</p>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 font-medium text-gray-800">
                              <FaUserCircle className="text-primary shrink-0 text-sm" />
                              {t.assignee}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-gray-600">{t.team}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catConf.badge}`}
                            >
                              {catConf.icon}
                              {t.category}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-gray-600 font-medium">
                            <div className="flex flex-col">
                              <span>
                                {t.deadlineDate
                                  ? `${t.deadlineDate.getDate()} ${MONTH_NAMES[t.deadlineDate.getMonth()].slice(0, 3)} ${t.deadlineDate.getFullYear()}`
                                  : "Tanpa Deadline"}
                              </span>
                              {t.startDate && (
                                <span className="text-[10px] text-gray-400">
                                  Mulai: {t.startDate.getDate()} {MONTH_NAMES[t.startDate.getMonth()].slice(0, 3)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statConf.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statConf.dot}`}></span>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-light rounded-lg transition-colors cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: DETAIL TASK / ISIAN YANG HARUS DIKERJAKAN         */}
        {/* ========================================================= */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      (CATEGORY_CONFIG[selectedTask.category] || CATEGORY_CONFIG.Feature).badge
                    }`}
                  >
                    {(CATEGORY_CONFIG[selectedTask.category] || CATEGORY_CONFIG.Feature).icon}
                    {selectedTask.category}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      (STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.Backlog).badge
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        (STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.Backlog).dot
                      }`}
                    ></span>
                    {selectedTask.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Judul & SP */}
              <div className="py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-extrabold text-lg text-gray-900 leading-snug">{selectedTask.title}</h3>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0">
                    {selectedTask.point} SP
                  </span>
                </div>

                {/* Deskripsi & Isian Instruksi Pengerjaan */}
                <div className="bg-gray-50/80 border border-gray-200/70 rounded-2xl p-3.5 mb-4">
                  <p className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <FaTasks className="text-primary text-xs" />
                    Rincian Instruksi / Isian yang Harus Dikerjakan:
                  </p>
                  <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {selectedTask.description ? (
                      selectedTask.description
                    ) : (
                      <span className="text-gray-400 italic">
                        Tidak ada catatan deskripsi khusus untuk tugas ini. Silakan konfirmasi ke PIC atau Product Owner.
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid Informasi Rinci */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">Penanggung Jawab</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
                      <FaUserCircle className="text-primary" /> {selectedTask.assignee}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">Divisi / Tim</span>
                    <span className="font-bold text-gray-800 mt-0.5 block">{selectedTask.team}</span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">Target Deadline</span>
                    <span className="font-bold text-rose-600 flex items-center gap-1.5 mt-0.5">
                      <FaCalendarAlt size={11} />
                      {selectedTask.deadlineDate
                        ? `${selectedTask.deadlineDate.getDate()} ${
                            MONTH_NAMES[selectedTask.deadlineDate.getMonth()]
                          } ${selectedTask.deadlineDate.getFullYear()}`
                        : "-"}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">SLA Pengerjaan</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
                      <FaClock size={11} className="text-gray-400" /> {selectedTask.sla}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    navigate("/tasks");
                  }}
                  className="px-4 py-2 bg-primary-light hover:bg-primary/20 text-primary text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <FaExternalLinkAlt size={10} />
                  Buka di Papan Kanban
                </button>

                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: DAFTAR TUGAS DI HARI TERTENTU (POPUP +X LAGI)     */}
        {/* ========================================================= */}
        {dayTasksModal && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Agenda & Tugas: {dayTasksModal.date.getDate()} {MONTH_NAMES[dayTasksModal.date.getMonth()]}{" "}
                    {dayTasksModal.date.getFullYear()}
                  </h3>
                  <p className="text-xs text-gray-400">{dayTasksModal.tasks.length} item terjadwal</p>
                </div>
                <button
                  onClick={() => setDayTasksModal(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 py-3 flex-1">
                {dayTasksModal.tasks.map((t) => {
                  const catConf = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.Feature;
                  const statConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.Backlog;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setDayTasksModal(null);
                      }}
                      className="p-3 rounded-2xl border border-gray-200 hover:border-primary/50 hover:bg-primary-light/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${catConf.badge}`}
                        >
                          {catConf.icon}
                          {t.category}
                        </span>
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${statConf.badge}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-gray-900">{t.title}</p>
                      {t.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{t.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 text-[10px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <FaUserCircle className="text-primary" /> {t.assignee}
                        </span>
                        <span className="font-bold text-amber-600">{t.point} SP</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-right border-t border-gray-100">
                <button
                  onClick={() => setDayTasksModal(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
