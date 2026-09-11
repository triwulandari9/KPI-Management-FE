import { useState } from "react";
import { FaBars, FaCamera, FaTimes, FaTrashAlt, FaExclamationCircle } from "react-icons/fa";
import logo from "../assets/logo.png";
import foto from "../assets/foto.jpg";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { employeeService } from "../services/employeeService";

export default function Header() {
  const { collapsed, setCollapsed, toggleMobile } = useSidebar();
  const { currentUser, updateUserProfile } = useAuth();

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [newAvatarPreview, setNewAvatarPreview] = useState("");
  const [photoError, setPhotoError] = useState("");

  const userName = currentUser?.name || "Sari";
  const userRole = currentUser?.role || "Karyawan";
  const userAvatar =
    currentUser?.avatar ||
    foto;

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      toggleMobile();
    } else {
      setCollapsed(!collapsed);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  // Kompresi foto agar ukuran string Base64 kecil (~20-40KB) sehingga selalu diterima oleh database backend
  const compressImageFile = (file, maxWidth = 300, maxHeight = 300, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = () => resolve(event.target.result);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleOpenPhotoModal = () => {
    setNewAvatarPreview(currentUser?.avatar || "");
    setPhotoError("");
    setIsPhotoModalOpen(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Batasan format: JPG, JPEG, PNG
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExt = file.name.split(".").pop().toLowerCase();
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      setPhotoError("Format file tidak didukung! Harap upload foto JPG, JPEG, atau PNG.");
      return;
    }

    // Batasan ukuran: Maks 2MB
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Ukuran foto terlalu besar! Maksimal 2MB.");
      return;
    }

    setPhotoError("");
    try {
      const compressed = await compressImageFile(file, 300, 300, 0.75);
      setNewAvatarPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setPhotoError("");

    try {
      // 1. Cari ID karyawan yang cocok di database
      let targetEmpId = currentUser?._id || currentUser?.id;
      try {
        const allEmployees = await employeeService.getEmployees();
        if (Array.isArray(allEmployees) && allEmployees.length > 0) {
          const matched = allEmployees.find(
            (emp) =>
              (emp.email && currentUser?.email && emp.email.toLowerCase() === currentUser.email.toLowerCase()) ||
              (emp.name && currentUser?.name && emp.name.toLowerCase() === currentUser.name.toLowerCase()) ||
              (emp._id && emp._id === targetEmpId) ||
              (emp.id && emp.id === targetEmpId)
          );
          if (matched) {
            targetEmpId = matched._id || matched.id;
          }
        }
      } catch (findErr) {
        console.warn("Gagal lookup employee ID:", findErr);
      }

      // 2. Simpan ke backend database
      if (targetEmpId) {
        await employeeService.updateEmployee(targetEmpId, { avatar: newAvatarPreview });
      }

      // 3. Update profile di state lokal & localStorage
      updateUserProfile({ avatar: newAvatarPreview });

      // 4. Notifikasi agar komponen seperti Employees.jsx langsung memperbarui tampilan kartu
      // Update other tabs via localStorage
      try {
        localStorage.setItem(
          "kpi_avatar_updated",
          JSON.stringify({ avatar: newAvatarPreview, email: currentUser?.email, id: targetEmpId })
        );
      } catch (e) {
        console.warn("Failed to write avatar update to localStorage", e);
      }
      // Emit event for current tab components
      window.dispatchEvent(
        new CustomEvent("user_avatar_updated", {
          detail: { avatar: newAvatarPreview, email: currentUser?.email, id: targetEmpId },
        })
      );

      setIsPhotoModalOpen(false);
    } catch (err) {
      console.error("Gagal simpan avatar ke server database:", err);
      // Tetap update lokal jika ada kendala koneksi
      updateUserProfile({ avatar: newAvatarPreview });
      setIsPhotoModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-4 sm:px-6 lg:px-8 fixed top-0 left-0 right-0 z-30 shadow-2xs">
        {/* Sisi Kiri: Hamburger & Logo */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            onClick={handleToggle}
            className="text-gray-700 hover:text-primary cursor-pointer p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
            title="Buka / Tutup Menu"
            aria-label="Toggle Menu"
          >
            <FaBars size={18} />
          </button>
          <img src={logo} alt="Assist.id" className="h-8 sm:h-9 w-auto object-contain" />
        </div>

        {/* Sisi Kanan: Profil Pengguna (Bisa diklik untuk ganti foto) */}
        <div
          onClick={handleOpenPhotoModal}
          className="flex items-center gap-2.5 sm:gap-3 p-1 sm:p-1.5 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group"
          title="Klik untuk ubah foto profil"
        >
          <div className="relative">
            <img
              src={userAvatar}
              alt="avatar"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff&bold=true`;
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all shrink-0 bg-gray-50"
            />
            <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-white p-1 rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
              <FaCamera />
            </span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 leading-tight text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none group-hover:text-primary transition-colors">
              {userName}
            </p>
            <span
              className={`inline-block text-[9px] sm:text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-full ${
                userRole?.toUpperCase() === "HR"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-primary"
              }`}
            >
              {userRole}
            </span>
          </div>
        </div>
      </header>

      {/* Modal Ubah Foto Profil Pengguna */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                  <FaCamera size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-800">Ubah Foto Profil</h3>
                  <p className="text-xs text-gray-400">{userName} ({userRole})</p>
                </div>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3">
                <img
                  src={
                    newAvatarPreview ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3b82f6&color=fff&bold=true`
                  }
                  alt="Preview Foto"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20 shadow-md bg-gray-50"
                />

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-primary hover:bg-primary-dark text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm">
                    <FaCamera size={12} /> Pilih Foto Baru
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {newAvatarPreview && (
                    <button
                      type="button"
                      onClick={() => setNewAvatarPreview("")}
                      className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 transition-colors border border-red-200"
                      title="Hapus foto dan gunakan avatar inisial"
                    >
                      <FaTrashAlt size={12} />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 text-center">
                  Hanya mendukung format: <b>JPG, JPEG, PNG</b> (Maks. 2MB)
                </p>

                {photoError && (
                  <div className="w-full flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    <FaExclamationCircle className="shrink-0" />
                    <span>{photoError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer"
                >
                  Simpan Foto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}