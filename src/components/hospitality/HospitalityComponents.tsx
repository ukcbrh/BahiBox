import React, { useState, useEffect, useRef } from "react";
import { StaffRolesView } from "../StaffRolesView";
import { PaymentBottomSheet } from "../PaymentComponents";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Truck, 
  Hotel,
  Bed,
  CalendarCheck,
  Utensils,
  ChefHat,
  Receipt,
  Sparkles,
  Cloud,
  Package,
  Users,
  PieChart,
  Settings,
  Search,
  Plus,
  Filter,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  Map,
  X,
  Edit,
  Trash2,
  Image as ImageIcon,
  UtensilsCrossed,
  Minus,
  Send,
  ArrowLeft,
  ShoppingCart,
  LayoutGrid,
  QrCode,
  CheckCircle2,
  ScanLine,
  Star,
} from "lucide-react";
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { LiveTrackingMap } from "../consumer/LiveTrackingMap";
import { ConsumerAuthModal } from "../consumer/ConsumerAuthModal";
import { getSupabaseClient } from "../../lib/supabase";
import { toast } from "sonner";
import { SettingsGeneral } from "../SettingsGeneral";
import { BillFormatSettings } from "../BillFormatSettings";

// 1. Dashboard [HOME]
export const HospitalityDashboard = () => {
  const { currentTenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todaySale, setTodaySale] = useState(0);
  const [totalRooms, setTotalRooms] = useState(0);
  const [occupiedRooms, setOccupiedRooms] = useState(0);
  const [onlineOrdersCount, setOnlineOrdersCount] = useState(0);
  const [pendingOnlineCount, setPendingOnlineCount] = useState(0);
  const [dirtyRoomsCount, setDirtyRoomsCount] = useState(0);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [totalTables, setTotalTables] = useState(0);
  const [occupiedRoomIds, setOccupiedRoomIds] = useState<Set<string>>(
    new Set(),
  );
  const [occupiedTables, setOccupiedTables] = useState(0);
  const [activeKotsCount, setActiveKotsCount] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data: branchData } = await supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", currentTenantId)
        .eq("module_key", "hospitality")
        .limit(1)
        .single();
      const bId = branchData?.id;
      if (!bId) {
        setLoading(false);
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("total, order_type, status")
        .eq("branch_id", bId)
        .gte("created_at", todayStart.toISOString());
      const sale = (ordersData || []).reduce(
        (s: number, o: any) => s + (o.total || 0),
        0,
      );
      setTodaySale(sale);
      const onlineOrders = (ordersData || []).filter(
        (o: any) => o.order_type === "online",
      );
      setOnlineOrdersCount(onlineOrders.length);
      setPendingOnlineCount(
        onlineOrders.filter(
          (o: any) => o.status === "New" || o.status === "Ready to Pack",
        ).length,
      );

      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*, room_types(type_name)")
        .eq("branch_id", bId)
        .eq("is_active", true)
        .order("room_number");
      setRoomsList(roomsData || []);
      setTotalRooms((roomsData || []).length);
      setDirtyRoomsCount(
        (roomsData || []).filter((r: any) => r.housekeeping_status === "dirty")
          .length,
      );

      const { data: activeBookings } = await supabase
        .from("room_bookings")
        .select("room_id")
        .eq("branch_id", bId)
        .eq("status", "checked_in");
      const occSet = new Set<string>((activeBookings || []).map((b: any) => String(b.room_id)));
      setOccupiedRoomIds(occSet as any);
      setOccupiedRooms(occSet.size);

      const { data: tablesData } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("tenant_id", currentTenantId);
      setTotalTables((tablesData || []).length);

      const { data: kotsData } = await supabase
        .from("kitchen_order_tickets")
        .select("id, table_id, order_type")
        .eq("tenant_id", currentTenantId)
        .neq("status", "served");
      setActiveKotsCount((kotsData || []).length);
      setOccupiedTables(
        new Set(
          (kotsData || [])
            .filter((k: any) => k.order_type === "dine_in" && k.table_id)
            .map((k: any) => k.table_id),
        ).size,
      );

      const { data: ingredientsData } = await supabase
        .from("ingredients")
        .select("id, ingredient_name, reorder_level")
        .eq("tenant_id", currentTenantId)
        .eq("is_active", true);
      const { data: stockData } = await supabase
        .from("ingredient_stock")
        .select("ingredient_id, current_quantity")
        .eq("branch_id", bId);
      const stockMap: Record<string, number> = {};
      (stockData || []).forEach((s: any) => {
        stockMap[s.ingredient_id] = s.current_quantity;
      });
      const lowStockAlerts = (ingredientsData || [])
        .filter(
          (ing: any) => (stockMap[ing.id] ?? 0) < (ing.reorder_level || 0),
        )
        .map((ing: any) => ({
          title: `Low Stock: ${ing.ingredient_name}`,
          time: "Now",
          type: "warning",
        }));

      const dirtyRoomAlerts = (roomsData || [])
        .filter((r: any) => r.housekeeping_status === "dirty")
        .slice(0, 5)
        .map((r: any) => ({
          title: `Room ${r.room_number} needs cleaning`,
          time: "Now",
          type: "error",
        }));

      setAlerts([...dirtyRoomAlerts, ...lowStockAlerts]);
      setLoading(false);
    };
    fetchDashboard();
  }, [currentTenantId]);

  const occupancyPercent =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const tableOccupancyPercent =
    totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const stats = [
    {
      label: "Today's Sale",
      value: `₹${todaySale.toLocaleString("en-IN")}`,
      trend: "Rooms + Restaurant + Online",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Room Occupancy",
      value: `${occupancyPercent}%`,
      trend: `${occupiedRooms}/${totalRooms} Rooms`,
      icon: Bed,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Table Occupancy",
      value: `${tableOccupancyPercent}%`,
      trend: `${occupiedTables}/${totalTables} Tables`,
      icon: Utensils,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Online Orders",
      value: onlineOrdersCount.toString(),
      trend: `Pending: ${pendingOnlineCount}`,
      icon: Cloud,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Pending HK",
      value: `${dirtyRoomsCount} Rooms`,
      trend: `${activeKotsCount} Active KOTs`,
      icon: Sparkles,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Hotel Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Real-time overview of your property
          </p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Clock size={16} />
          Run Night Audit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {stat.value}
              </h3>
              <p className="text-xs font-medium text-slate-400">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Map size={18} className="text-primary" />
              Live Room Status
            </h3>
            <div className="flex gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>{" "}
                Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>{" "}
                Dirty
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {roomsList.length === 0 ? (
              <p className="col-span-full text-center text-slate-400 text-sm py-6">
                No rooms added yet.
              </p>
            ) : (
              roomsList.map((room) => {
                const status =
                  room.housekeeping_status === "dirty"
                    ? "dirty"
                    : occupiedRoomIds.has(room.id)
                      ? "occupied"
                      : "available";
                const colors: Record<string, string> = {
                  dirty: "bg-yellow-50 border-yellow-200 text-yellow-700",
                  occupied: "bg-red-50 border-red-200 text-red-700",
                  available: "bg-green-50 border-green-200 text-green-700",
                };
                return (
                  <div
                    key={room.id}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 ${colors[status]}`}
                  >
                    <span className="font-bold text-lg">
                      {room.room_number}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider">
                      {status.substring(0, 3)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Bell size={18} className="text-orange-500" />
            Alert Center
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">
                No alerts right now. All clear!
              </p>
            ) : (
              alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-900 rounded-xl"
                >
                  <AlertTriangle
                    size={16}
                    className={
                      alert.type === "error"
                        ? "text-red-500"
                        : "text-orange-500"
                    }
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-400">{alert.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Front Desk
export const HospitalityFrontDesk = () => {
  const { currentTenantId } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    "rooms" | "types" | "bookings"
  >("rooms");
  const [bookings, setBookings] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numGuests, setNumGuests] = useState("1");
  const [folioBooking, setFolioBooking] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");
  const [newTypeOccupancy, setNewTypeOccupancy] = useState("2");
  const [newTypeGst, setNewTypeGst] = useState("12");
  const [newTypePhotos, setNewTypePhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [uploadingTypePhotoIdx, setUploadingTypePhotoIdx] = useState<
    number | null
  >(null);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomFloor, setNewRoomFloor] = useState("");
  const [newRoomTypeId, setNewRoomTypeId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) {
      setLoading(false);
      return;
    }

    const { data: branchData } = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", currentTenantId)
      .eq("module_key", "hospitality")
      .limit(1)
      .single();
    const bId = branchData?.id;
    setBranchId(bId || null);
    if (!bId) {
      setLoading(false);
      return;
    }

    const { data: typesData } = await supabase
      .from("room_types")
      .select("*")
      .eq("branch_id", bId)
      .eq("is_active", true)
      .order("type_name");
    setRoomTypes(typesData || []);

    const { data: roomsData } = await supabase
      .from("rooms")
      .select("*, room_types(type_name, base_price)")
      .eq("branch_id", bId)
      .eq("is_active", true)
      .order("room_number");
    setRooms(roomsData || []);

    const { data: bookingsData } = await supabase
      .from("room_bookings")
      .select("*, rooms(room_number)")
      .eq("branch_id", bId)
      .in("status", ["booked", "checked_in"])
      .order("check_in_date");
    setBookings(bookingsData || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentTenantId]);

  const handleTypePhotoUpload = async (file: File, idx: number) => {
    if (!currentTenantId || !file) return;
    setUploadingTypePhotoIdx(idx);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUploadingTypePhotoIdx(null);
      return;
    }
    const filePath = `${currentTenantId}/room-types/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);
    if (uploadError) {
      toast.error(`Photo upload failed: ${uploadError.message}`);
      setUploadingTypePhotoIdx(null);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);
    setNewTypePhotos((prev) =>
      prev.map((p, i) => (i === idx ? urlData.publicUrl : p)),
    );
    setUploadingTypePhotoIdx(null);
  };

  const handleAddType = async () => {
    if (!newTypeName || !branchId || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("room_types").insert({
      tenant_id: currentTenantId,
      branch_id: branchId,
      type_name: newTypeName,
      base_price: parseFloat(newTypePrice) || 0,
      max_occupancy: parseInt(newTypeOccupancy) || 2,
      gst_rate_percent: parseFloat(newTypeGst) || 0,
      photos: newTypePhotos.filter((p) => p !== null),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Room type added");
    setNewTypeName("");
    setNewTypePrice("");
    setNewTypeOccupancy("2");
    setShowTypeModal(false);
    fetchData();
  };

  const handleAddRoom = async () => {
    if (!newRoomNumber || !newRoomTypeId || !branchId || !currentTenantId)
      return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("rooms").insert({
      tenant_id: currentTenantId,
      branch_id: branchId,
      room_type_id: newRoomTypeId,
      room_number: newRoomNumber,
      floor: newRoomFloor || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Room added");
    setNewRoomNumber("");
    setNewRoomFloor("");
    setNewRoomTypeId("");
    setShowRoomModal(false);
    fetchData();
  };

  const { user } = useAuth();

  const handleCreateBooking = async () => {
    if (
      !bookingRoomId ||
      !guestName ||
      !checkInDate ||
      !checkOutDate ||
      !branchId ||
      !currentTenantId
    )
      return;
    const room = rooms.find((r) => r.id === bookingRoomId);
    if (!room) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("room_bookings").insert({
      tenant_id: currentTenantId,
      branch_id: branchId,
      room_id: bookingRoomId,
      guest_name: guestName,
      guest_phone: guestPhone || null,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_guests: parseInt(numGuests) || 1,
      room_rate: room.room_types?.base_price || 0,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking created");
    setGuestName("");
    setGuestPhone("");
    setCheckInDate("");
    setCheckOutDate("");
    setNumGuests("1");
    setBookingRoomId("");
    setShowBookingModal(false);
    fetchData();
  };

  const handleCheckIn = async (bookingId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("check_in_guest", {
      p_booking_id: bookingId,
      p_checked_in_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Guest checked in");
    fetchData();
  };

  const handleCheckOut = async (bookingId: string) => {
    if (!window.confirm("Check out this guest? This will finalize the bill."))
      return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc("check_out_guest", {
      p_booking_id: bookingId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Checked out. Final bill: ₹${data?.final_bill_amount || 0}`);
    fetchData();
  };

  const statusColors: Record<string, string> = {
    clean: "bg-emerald-100 text-emerald-700",
    dirty: "bg-amber-100 text-amber-700",
    inspected: "bg-blue-100 text-blue-700",
    out_of_order: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CalendarCheck size={24} /> Front Desk & Guest Operations
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Manage rooms, room types, bookings, and check-ins.
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex w-fit">
        <button
          onClick={() => setActiveSubTab("rooms")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "rooms" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Rooms
        </button>
        <button
          onClick={() => setActiveSubTab("bookings")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "bookings" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Bookings
        </button>
        <button
          onClick={() => setActiveSubTab("types")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "types" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Room Types
        </button>
      </div>

      {activeSubTab === "types" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Room Types ({roomTypes.length})
              </h3>
              <Button size="sm" onClick={() => setShowTypeModal(true)}>
                + Add Room Type
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                Loading...
              </p>
            ) : roomTypes.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No room types yet. Add one to get started.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {roomTypes.map((rt) => (
                  <div
                    key={rt.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-xl p-4"
                  >
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {rt.type_name}
                    </p>
                    <p className="text-sm text-primary font-extrabold">
                      ₹{rt.base_price}/night
                    </p>
                    <p className="text-xs text-slate-400">
                      Max {rt.max_occupancy} guests
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === "rooms" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Rooms ({rooms.length})
              </h3>
              <Button
                size="sm"
                onClick={() => setShowRoomModal(true)}
                disabled={roomTypes.length === 0}
              >
                + Add Room
              </Button>
            </div>
            {roomTypes.length === 0 && (
              <p className="text-xs text-amber-600 mb-3">
                Add a Room Type first before adding rooms.
              </p>
            )}
            {loading ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                Loading...
              </p>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No rooms yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-xl p-4"
                  >
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Room {r.room_number}
                    </p>
                    <p className="text-xs text-slate-400 mb-2">
                      {r.room_types?.type_name}{" "}
                      {r.floor ? `· Floor ${r.floor}` : ""}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[r.housekeeping_status]}`}
                    >
                      {r.housekeeping_status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === "bookings" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Active Bookings ({bookings.length})
              </h3>
              <Button
                size="sm"
                onClick={() => setShowBookingModal(true)}
                disabled={rooms.length === 0}
              >
                + New Booking
              </Button>
            </div>
            {rooms.length === 0 && (
              <p className="text-xs text-amber-600 mb-3">
                Add a Room first before creating bookings.
              </p>
            )}
            {loading ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                Loading...
              </p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No active bookings.
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {b.guest_name}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          · Room {b.rooms?.room_number}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {b.check_in_date} → {b.check_out_date} · {b.num_guests}{" "}
                        guest(s)
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${b.status === "booked" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>
                    {b.status === "booked" && (
                      <Button size="sm" onClick={() => handleCheckIn(b.id)}>
                        Check In
                      </Button>
                    )}
                    {b.status === "checked_in" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFolioBooking(b)}
                        >
                          Order Food
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(b.id)}
                        >
                          Check Out
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {folioBooking && (
        <RoomFolioOrderModal
          booking={folioBooking}
          onClose={() => setFolioBooking(null)}
        />
      )}

      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                New Booking
              </h3>
              <select
                value={bookingRoomId}
                onChange={(e) => setBookingRoomId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm"
              >
                <option value="">Select room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.room_types?.type_name} (₹
                    {r.room_types?.base_price}/night)
                  </option>
                ))}
              </select>
              <Input
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <Input
                placeholder="Guest phone (optional)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Check-in
                  </label>
                  <Input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Check-out
                  </label>
                  <Input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                  />
                </div>
              </div>
              <Input
                type="number"
                placeholder="Number of guests"
                value={numGuests}
                onChange={(e) => setNumGuests(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateBooking}
                  disabled={
                    !bookingRoomId ||
                    !guestName ||
                    !checkInDate ||
                    !checkOutDate
                  }
                >
                  Book
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Add Room Type
              </h3>
              <Input
                placeholder="Type name (e.g. Deluxe)"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Base price per night"
                value={newTypePrice}
                onChange={(e) => setNewTypePrice(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Max occupancy"
                value={newTypeOccupancy}
                onChange={(e) => setNewTypeOccupancy(e.target.value)}
              />
              <Input
                type="number"
                placeholder="GST % (e.g. 12)"
                value={newTypeGst}
                onChange={(e) => setNewTypeGst(e.target.value)}
              />
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">
                  Room Photos (up to 4)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <label
                      key={idx}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer overflow-hidden relative bg-slate-50 dark:bg-slate-900"
                    >
                      {newTypePhotos[idx] ? (
                        <img
                          src={newTypePhotos[idx] as string}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : uploadingTypePhotoIdx === idx ? (
                        <span className="text-[10px] text-slate-400">...</span>
                      ) : (
                        <Plus size={16} className="text-slate-300" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          handleTypePhotoUpload(e.target.files[0], idx)
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTypeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddType}
                  disabled={!newTypeName}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Add Room
              </h3>
              <Input
                placeholder="Room number (e.g. 101)"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
              />
              <Input
                placeholder="Floor (optional)"
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(e.target.value)}
              />
              <select
                value={newRoomTypeId}
                onChange={(e) => setNewRoomTypeId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm"
              >
                <option value="">Select room type</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.type_name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRoomModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddRoom}
                  disabled={!newRoomNumber || !newRoomTypeId}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 3. Restaurant
export const HospitalityRestaurant = () => {
  const { currentTenantId } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [kots, setKots] = useState<any[]>([]);
  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [qrTable, setQrTable] = useState<any>(null);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [showKiosks, setShowKiosks] = useState(false);
  const [isAddingKiosk, setIsAddingKiosk] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<any>(null);
  const [newKioskLocation, setNewKioskLocation] = useState("");
  const [manageAds, setManageAds] = useState<any[]>([]);
  const [showAdsManager, setShowAdsManager] = useState(false);
  const [uploadingAd, setUploadingAd] = useState(false);

  const fetchManageAds = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("kiosk_ads")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .order("display_order");
    if (data) setManageAds(data);
  };

  const handleUploadAd = async (file: File) => {
    if (!currentTenantId || !file) return;
    setUploadingAd(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUploadingAd(false);
      return;
    }
    const filePath = `${currentTenantId}/kiosk-ads/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);
    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setUploadingAd(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);
    const { error } = await supabase.from("kiosk_ads").insert({
      tenant_id: currentTenantId,
      image_url: urlData.publicUrl,
      display_order: manageAds.length,
    });
    if (error) {
      toast.error(error.message);
      setUploadingAd(false);
      return;
    }
    toast.success("Ad uploaded");
    setUploadingAd(false);
    fetchManageAds();
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm("Delete this ad?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("kiosk_ads").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ad deleted");
    fetchManageAds();
  };

  const fetchKiosks = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("kiosk_devices")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .order("created_at");
    if (data) setKiosks(data);
  };

  const handleSaveKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newKioskLocation) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (editingKiosk) {
      const { error } = await supabase
        .from("kiosk_devices")
        .update({ location_name: newKioskLocation })
        .eq("id", editingKiosk.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Kiosk updated");
    } else {
      const { error } = await supabase.from("kiosk_devices").insert({
        tenant_id: currentTenantId,
        location_name: newKioskLocation,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Kiosk added");
    }
    setIsAddingKiosk(false);
    setEditingKiosk(null);
    setNewKioskLocation("");
    fetchKiosks();
  };

  const handleDeleteKiosk = async (id: string) => {
    if (!window.confirm("Delete this kiosk?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("kiosk_devices")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kiosk deleted");
    fetchKiosks();
  };

  const handleCopyKioskUrl = (kioskId: string) => {
    const url = `${window.location.origin}/table-order?tenant_id=${currentTenantId}&kiosk_id=${kioskId}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied! Open this link on the kiosk device.");
  };
  const [linkMode, setLinkMode] = useState(false);
  const [selectedForLink, setSelectedForLink] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTable, setNewTable] = useState({
    table_number: "",
    dining_area: "",
    capacity: "4",
  });
  const [cart, setCart] = useState<
    {
      menu_item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }[]
  >([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const fetchTables = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .eq("is_active", true)
      .order("table_number");
    if (data) setTables(data);
  };

  const fetchOpenKots = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("kitchen_order_tickets")
      .select("*, kot_items(*, restaurant_menu_items(item_name, price))")
      .eq("tenant_id", currentTenantId)
      .eq("order_type", "dine_in")
      .neq("status", "served");
    if (data) setKots(data);
  };

  const fetchTableOrders = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("orders")
      .select("id, table_id, num_guests, created_at")
      .eq("tenant_id", currentTenantId)
      .eq("order_type", "dine_in");
    if (data) setTableOrders(data);
  };

  const fetchMenu = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const [itemsRes, catsRes] = await Promise.all([
      supabase
        .from("restaurant_menu_items")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .eq("is_active", true)
        .eq("is_available", true),
      supabase
        .from("restaurant_menu_categories")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .eq("is_active", true)
        .order("display_order"),
    ]);
    if (itemsRes.data) setMenuItems(itemsRes.data);
    if (catsRes.data) setMenuCategories(catsRes.data);
  };

  useEffect(() => {
    fetchTables();
    fetchOpenKots();
    fetchMenu();
    fetchTableOrders();
    fetchKiosks();
    fetchManageAds();
  }, [currentTenantId]);

  const getOccupiedSeats = (table: any) => {
    const relevantOrders = tableOrders.filter(
      (o) =>
        o.table_id === table.id &&
        new Date(o.created_at) >= new Date(table.last_reset_at),
    );
    return relevantOrders.reduce((sum, o) => sum + (o.num_guests || 1), 0);
  };

  const getTableStatus = (table: any) => {
    const occupiedSeats = getOccupiedSeats(table);
    const activeKot = kots.find((k) => k.table_id === table.id);
    if (occupiedSeats > 0 || activeKot)
      return {
        label: `${occupiedSeats}/${table.capacity} seats`,
        color:
          "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300",
      };
    if (table.status === "billing")
      return {
        label: "Billing",
        color:
          "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
      };
    return {
      label: "Available",
      color:
        "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
  };

  const handleResetTable = async (tableId: string) => {
    if (
      !window.confirm(
        "Reset this table? This clears seat occupancy for new guests.",
      )
    )
      return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("kitchen_order_tickets")
      .update({ status: "served" })
      .eq("table_id", tableId)
      .neq("status", "served");
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ last_reset_at: new Date().toISOString() })
      .eq("id", tableId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Table reset");
    fetchTables();
    fetchTableOrders();
    fetchOpenKots();
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newTable.table_number) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (editingTable) {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({
          table_number: newTable.table_number,
          dining_area: newTable.dining_area || null,
          capacity: parseInt(newTable.capacity) || 4,
        })
        .eq("id", editingTable.id);
      if (error) {
        toast.error(`Failed to update table: ${error.message}`);
        return;
      }
      toast.success("Table updated");
    } else {
      const branchRes = await supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", currentTenantId)
        .limit(1)
        .single();
      const branchId = branchRes.data?.id;
      if (!branchId) {
        toast.error("No branch found for this tenant");
        return;
      }
      const { error } = await supabase.from("restaurant_tables").insert({
        tenant_id: currentTenantId,
        branch_id: branchId,
        table_number: newTable.table_number,
        dining_area: newTable.dining_area || null,
        capacity: parseInt(newTable.capacity) || 4,
      });
      if (error) {
        toast.error(`Failed to add table: ${error.message}`);
        return;
      }
      toast.success("Table added");
    }
    setIsAddingTable(false);
    setEditingTable(null);
    setNewTable({ table_number: "", dining_area: "", capacity: "4" });
    fetchTables();
  };

  const handleLinkTables = async () => {
    if (selectedForLink.length < 2) {
      toast.error("Select at least 2 tables to link");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc("link_tables", {
      p_table_ids: selectedForLink,
    });
    if (error) {
      toast.error(`Failed to link: ${error.message}`);
      return;
    }
    toast.success(`${data.linked_count} tables linked`);
    setLinkMode(false);
    setSelectedForLink([]);
    fetchTables();
  };

  const handleUnlinkTable = async (groupId: string) => {
    if (!window.confirm("Unlink these tables?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("unlink_table_group", {
      p_group_id: groupId,
    });
    if (error) {
      toast.error(`Failed to unlink: ${error.message}`);
      return;
    }
    toast.success("Tables unlinked");
    fetchTables();
  };

  const handleDeleteTable = async (tableId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: checkData, error: checkError } = await supabase.rpc(
      "safe_delete_check",
      {
        p_parent_table: "restaurant_tables",
        p_parent_id: tableId,
        p_child_checks: [
          { table: "kitchen_order_tickets", column: "table_id" },
        ],
      },
    );
    if (checkError) {
      toast.error(`Failed to check: ${checkError.message}`);
      return;
    }
    if (!checkData.safe_to_delete) {
      toast.error(
        `Cannot delete: this table has order history. Reset it instead.`,
      );
      return;
    }
    if (!window.confirm("Delete this table?")) return;
    const { error } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", tableId);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success("Table deleted");
    fetchTables();
  };

  const openTable = (table: any) => {
    setSelectedTable(table);
    setCart([]);
    setOrderNotes("");
  };

  const addToCart = (item: any) => {
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c: any) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev: any[]) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const handleSendToKitchen = async () => {
    if (!currentTenantId || !selectedTable || cart.length === 0) return;
    setSendingOrder(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSendingOrder(false);
      return;
    }

    const branchIdRes = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", currentTenantId)
      .limit(1)
      .single();
    const branchId = branchIdRes.data?.id;
    if (!branchId) {
      toast.error("No branch found for this tenant");
      setSendingOrder(false);
      return;
    }

    const { data, error } = await supabase.rpc("create_food_order", {
      p_tenant_id: currentTenantId,
      p_branch_id: branchId,
      p_user_id: null,
      p_customer_name: `Table ${selectedTable.table_number}`,
      p_customer_phone: "",
      p_delivery_address: `Dine-in - Table ${selectedTable.table_number}`,
      p_payment_method: "cod",
      p_items: cart.map((c) => ({
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
      })),
      p_order_type: "dine_in",
      p_table_id: selectedTable.id,
    });

    if (error) {
      toast.error(`Failed to send order: ${error.message}`);
      setSendingOrder(false);
      return;
    }

    toast.success("Order sent to kitchen!");
    setCart([]);
    setOrderNotes("");
    setSelectedTable(null);
    setSendingOrder(false);
    fetchOpenKots();
  };

  const filteredMenuItems = activeCategoryId
    ? menuItems.filter((m) => m.category_id === activeCategoryId)
    : menuItems;

  if (selectedTable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedTable(null)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft size={16} /> Back to Table Map
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Table {selectedTable.table_number}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveCategoryId(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${!activeCategoryId ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
              >
                All
              </button>
              {menuCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${activeCategoryId === cat.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 border-2 rounded-sm ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {item.item_name}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary">
                    ₹{item.price}
                  </p>
                </button>
              ))}
              {filteredMenuItems.length === 0 && (
                <p className="col-span-full text-center text-slate-400 py-8 text-sm">
                  No menu items. Add some in Menu Management first.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 h-fit sticky top-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <ShoppingCart size={18} /> Current Order
            </h3>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Tap items to add them here.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {cart.map((c) => (
                  <div
                    key={c.menu_item_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {c.item_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        ₹{c.price} x {c.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateCartQty(c.menu_item_id, -1)}
                        className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-4 text-center font-bold">
                        {c.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(c.menu_item_id, 1)}
                        className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between mb-4">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Total
              </span>
              <span className="font-extrabold text-lg text-primary">
                ₹{cartTotal}
              </span>
            </div>
            <Button
              className="w-full h-11 gap-2"
              disabled={cart.length === 0 || sendingOrder}
              onClick={handleSendToKitchen}
            >
              <Send size={16} />{" "}
              {sendingOrder ? "Sending..." : "Send to Kitchen"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LayoutGrid size={24} /> Table Map
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Tap a table to take an order.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setLinkMode(!linkMode);
            setSelectedForLink([]);
          }}
        >
          {linkMode ? "Cancel Link" : "Link Tables"}
        </Button>
        <Button className="gap-2" onClick={() => setIsAddingTable(true)}>
          <Plus size={16} /> Table
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" /> Occupied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400" /> Billing
        </span>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <button
            onClick={() => setShowKiosks(!showKiosks)}
            className="w-full flex items-center justify-between"
          >
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Self-Order Kiosks ({kiosks.length})
            </span>
            <span className="text-xs text-slate-400">
              {showKiosks ? "Hide" : "Show"}
            </span>
          </button>
          {showKiosks && (
            <div className="mt-4 space-y-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setIsAddingKiosk(true)}
              >
                <Plus size={14} /> Add Kiosk
              </Button>
              {kiosks.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  No kiosks added yet.
                </p>
              ) : (
                kiosks.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl"
                  >
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {k.location_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => handleCopyKioskUrl(k.id)}
                      >
                        Copy URL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingKiosk(k);
                          setNewKioskLocation(k.location_name);
                          setIsAddingKiosk(true);
                        }}
                      >
                        <Edit size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => handleDeleteKiosk(k.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <button
            onClick={() => setShowAdsManager(!showAdsManager)}
            className="w-full flex items-center justify-between"
          >
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Kiosk Idle-Screen Ads ({manageAds.length})
            </span>
            <span className="text-xs text-slate-400">
              {showAdsManager ? "Hide" : "Show"}
            </span>
          </button>
          {showAdsManager && (
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="kiosk-ad-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadAd(e.target.files[0]);
                }}
              />
              <label
                htmlFor="kiosk-ad-upload"
                className="inline-flex items-center gap-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg cursor-pointer"
              >
                {uploadingAd ? "Uploading..." : "Upload Ad Image"}
              </label>
              {manageAds.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  No ads yet. Upload images to show on the kiosk when idle.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {manageAds.map((ad) => (
                    <div
                      key={ad.id}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={ad.image_url}
                        alt="Ad"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {tables.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => {
            const status = getTableStatus(table);
            const activeKot = kots.find((k) => k.table_id === table.id);
            const occupiedSeats = getOccupiedSeats(table);
            return (
              <div
                key={table.id}
                className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 ${status.color}`}
              >
                <button
                  onClick={() => {
                    if (linkMode) {
                      setSelectedForLink((prev) =>
                        prev.includes(table.id)
                          ? prev.filter((id) => id !== table.id)
                          : [...prev, table.id],
                      );
                    } else {
                      openTable(table);
                    }
                  }}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1 hover:shadow-md transition-shadow rounded-2xl ${selectedForLink.includes(table.id) ? "ring-4 ring-purple-500" : ""} ${table.linked_group_id ? "ring-2 ring-purple-300" : ""}`}
                >
                  <span className="text-2xl font-extrabold">
                    {table.table_number}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {status.label}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {table.capacity} seats
                  </span>
                  {table.linked_group_id && (
                    <span className="text-[8px] font-bold text-purple-600">
                      LINKED
                    </span>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrTable(table);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10"
                  title="Show QR Code"
                >
                  <QrCode size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTable(table);
                    setNewTable({
                      table_number: table.table_number,
                      dining_area: table.dining_area || "",
                      capacity: String(table.capacity),
                    });
                    setIsAddingTable(true);
                  }}
                  className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10"
                  title="Edit Table"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table.id);
                  }}
                  className="absolute top-1 left-8 w-6 h-6 rounded-full bg-white/70 dark:bg-black/40 flex items-center justify-center z-10 text-red-600"
                  title="Delete Table"
                >
                  <Trash2 size={12} />
                </button>
                {(occupiedSeats > 0 || activeKot) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetTable(table.id);
                    }}
                    className="absolute bottom-1 right-1 text-[9px] font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded-full z-10"
                    title="Reset Table"
                  >
                    Reset
                  </button>
                )}
                {table.linked_group_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkTable(table.linked_group_id);
                    }}
                    className="absolute bottom-1 left-1 text-[9px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full z-10"
                    title="Unlink Table"
                  >
                    Unlink
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <LayoutGrid className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No tables yet. Click "Table" to add your first one.
          </p>
        </div>
      )}

      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xs shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Table {qrTable.table_number} QR</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQrTable(null)}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-white p-4 rounded-xl inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://www.bahibox.com/table-order?tenant_id=${currentTenantId}&table_id=${qrTable.id}`)}`}
                  alt="Table QR Code"
                  className="w-full"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print this and place it on Table {qrTable.table_number}. Guests
                scan to view menu and order.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.print()}
              >
                Print QR
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {linkMode && selectedForLink.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button className="gap-2 shadow-xl" onClick={handleLinkTables}>
            Link {selectedForLink.length} Tables
          </Button>
        </div>
      )}
      {isAddingKiosk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{editingKiosk ? "Edit Kiosk" : "New Kiosk"}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddingKiosk(false);
                  setEditingKiosk(null);
                  setNewKioskLocation("");
                }}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveKiosk} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Kiosk Location</label>
                  <Input
                    required
                    value={newKioskLocation}
                    onChange={(e) => setNewKioskLocation(e.target.value)}
                    placeholder="E.g. Near Entrance, Family Area"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Just a name to help you remember where this device is
                    placed.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingKiosk(false);
                      setEditingKiosk(null);
                      setNewKioskLocation("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingKiosk ? "Save" : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      {isAddingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{editingTable ? "Edit Table" : "New Table"}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddingTable(false);
                  setEditingTable(null);
                  setNewTable({
                    table_number: "",
                    dining_area: "",
                    capacity: "4",
                  });
                }}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTable} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Table Number</label>
                  <Input
                    required
                    value={newTable.table_number}
                    onChange={(e) =>
                      setNewTable({ ...newTable, table_number: e.target.value })
                    }
                    placeholder="E.g. T1, 12"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Dining Area (optional)
                  </label>
                  <Input
                    value={newTable.dining_area}
                    onChange={(e) =>
                      setNewTable({ ...newTable, dining_area: e.target.value })
                    }
                    placeholder="E.g. Rooftop, Main Hall"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <Input
                    type="number"
                    value={newTable.capacity}
                    onChange={(e) =>
                      setNewTable({ ...newTable, capacity: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingTable(false);
                      setEditingTable(null);
                      setNewTable({
                        table_number: "",
                        dining_area: "",
                        capacity: "4",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTable ? "Save" : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 4. KDS
export const HospitalityKDS = () => {
  const { currentTenantId } = useAuth();
  const [kots, setKots] = useState<any[]>([]);

  const fetchKots = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("kitchen_order_tickets")
      .select(
        "*, kot_items(*, restaurant_menu_items(item_name, price)), restaurant_tables(table_number), orders(payment_method, total)",
      )
      .eq("tenant_id", currentTenantId)
      .in("status", ["pending_approval", "new", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (data) setKots(data);
  };

  useEffect(() => {
    fetchKots();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("kds_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kitchen_order_tickets" },
        () => fetchKots(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenantId]);

  const handleApprove = async (kotId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("approve_kot", { p_kot_id: kotId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order approved");
    fetchKots();
  };

  const handleReject = async (kotId: string) => {
    if (
      !window.confirm(
        "Reject this order? Payment (if any) will be auto-refunded.",
      )
    )
      return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("reject_kot", {
      p_kot_id: kotId,
      p_reason: "Rejected by manager",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order rejected");
    fetchKots();
  };

  const updateStatus = async (kotId: string, newStatus: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("kitchen_order_tickets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", kotId);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchKots();
  };

  const columns = [
    {
      key: "pending_approval",
      label: "Pending Approval",
      color: "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10",
    },
    {
      key: "new",
      label: "New",
      color: "border-blue-300 bg-blue-50/50 dark:bg-blue-900/10",
    },
    {
      key: "preparing",
      label: "Preparing",
      color: "border-orange-300 bg-orange-50/50 dark:bg-orange-900/10",
    },
    {
      key: "ready",
      label: "Ready",
      color: "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10",
    },
  ];

  const KotCard = ({ kot }: { kot: any }) => {
    const label = kot.table_id
      ? `Table ${kot.restaurant_tables?.table_number || ""}`
      : kot.order_type === "takeaway"
        ? "Takeaway"
        : "Online";
    const timeAgo = Math.round(
      (Date.now() - new Date(kot.created_at).getTime()) / 60000,
    );
    return (
      <Card className="shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {label}
            </span>
            <span className="text-[10px] text-slate-400">{timeAgo}m ago</span>
          </div>
          <div className="space-y-1">
            {kot.kot_items?.map((ki: any) => (
              <div
                key={ki.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {ki.restaurant_menu_items?.item_name || "Item"}
                </span>
                <span className="font-bold text-slate-500">x{ki.quantity}</span>
              </div>
            ))}
          </div>
          {kot.status === "pending_approval" && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleApprove(kot.id)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs text-red-600 border-red-200"
                onClick={() => handleReject(kot.id)}
              >
                Reject
              </Button>
            </div>
          )}
          {kot.status === "new" && (
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => updateStatus(kot.id, "preparing")}
            >
              Start Preparing
            </Button>
          )}
          {kot.status === "preparing" && (
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => updateStatus(kot.id, "ready")}
            >
              Mark Ready
            </Button>
          )}
          {kot.status === "ready" && (
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-slate-700 hover:bg-slate-800"
              onClick={() => updateStatus(kot.id, "served")}
            >
              Served
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ChefHat size={24} /> Kitchen Display
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Live orders — updates automatically.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colKots = kots.filter((k) => k.status === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-2xl border-2 p-3 ${col.color} min-h-[300px]`}
            >
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
                {col.label}{" "}
                <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">
                  {colKots.length}
                </span>
              </h3>
              <div className="space-y-3">
                {colKots.map((kot) => (
                  <KotCard key={kot.id} kot={kot} />
                ))}
                {colKots.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No orders
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 5. Smart POS
export const HospitalityPOS = () => {
  const { currentTenantId, user } = useAuth();
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string | null>(null);
  const [upiSessionStatus, setUpiSessionStatus] = useState<
    "pending" | "paid" | null
  >(null);
  const [upiChannel, setUpiChannel] = useState<any>(null);
  const [posActiveTab, setPosActiveTab] = useState<"pending" | "history">(
    "pending",
  );
  const [billHistory, setBillHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [branchUpiId, setBranchUpiId] = useState<string | null>(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState<
    "cod" | "wallet" | "upi"
  >("cod");
  const [processing, setProcessing] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);

  const fetchData = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: tablesData } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .eq("is_active", true);
    if (tablesData) setTables(tablesData);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, order_items(*, restaurant_menu_items(item_name))")
      .eq("tenant_id", currentTenantId)
      .eq("order_type", "dine_in")
      .eq("payment_status", "unpaid")
      .neq("status", "Cancelled");
    if (ordersData) setUnpaidOrders(ordersData);

    const { data: branchData } = await supabase
      .from("branches")
      .select("upi_id")
      .eq("tenant_id", currentTenantId)
      .limit(1)
      .single();
    if (branchData) setBranchUpiId(branchData.upi_id);
  };

  useEffect(() => {
    fetchData();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("pos_billing_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenantId]);

  const fetchBillHistory = async () => {
    setHistoryLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) {
      setHistoryLoading(false);
      return;
    }
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(50);
    setBillHistory(data || []);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (posActiveTab === "history") fetchBillHistory();
  }, [posActiveTab, currentTenantId]);

  const tablesWithBills = tables
    .map((t) => ({
      ...t,
      orders: unpaidOrders.filter((o) => o.table_id === t.id),
    }))
    .filter((t) => t.orders.length > 0);

  const selectedTableData = tablesWithBills.find(
    (t) => t.id === selectedTableId,
  );
  const selectedTotal =
    selectedTableData?.orders.reduce(
      (sum: number, o: any) => sum + (o.total || 0),
      0,
    ) || 0;

  const upiLink = branchUpiId
    ? `upi://pay?pa=${encodeURIComponent(branchUpiId)}&am=${selectedTotal}&cu=INR&tn=${encodeURIComponent("Table " + (selectedTableData?.table_number || ""))}`
    : "";

  const handleGenerateDynamicQr = async (tableData: any) => {
    if (!currentTenantId || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const branchId = tableData?.branch_id;
    if (!branchId) {
      toast.error("Branch not found for this table");
      return;
    }

    setUpiSessionStatus("pending");
    setDynamicQrUrl(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login again");
      setUpiSessionStatus(null);
      return;
    }

    const orderIds = tableData?.orders.map((o: any) => o.id) || [];
    const total =
      tableData?.orders.reduce(
        (sum: number, o: any) => sum + (o.total || 0),
        0,
      ) || 0;

    try {
      const response = await fetch("/api/create-dynamic-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          tenant_id: currentTenantId,
          branch_id: branchId,
          amount: total,
          reference_type: "table_bill",
          reference_id: null,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate QR");
      }
      const data = await response.json();
      setDynamicQrUrl(data.qr_image_url);

      const channel = supabase
        .channel("hosp_upi_wait_" + branchId + "_" + Date.now())
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "pos_display_sessions",
            filter: "branch_id=eq." + branchId,
          },
          async (payload: any) => {
            if (payload.new.status === "paid") {
              setUpiSessionStatus("paid");
              await supabase
                .from("orders")
                .update({ payment_status: "paid", payment_method: "upi" })
                .in("id", orderIds);
              supabase.removeChannel(channel);
              setTimeout(() => {
                toast.success("Bill collected: ₹" + total);
                setSelectedTableId(null);
                setDynamicQrUrl(null);
                setUpiSessionStatus(null);
                fetchData();
              }, 1500);
            }
          },
        )
        .subscribe();
      setUpiChannel(channel);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate QR");
      setUpiSessionStatus(null);
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedTableId) return;
    setProcessing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setProcessing(false);
      return;
    }

    if (billPaymentMethod === "wallet") {
      toast.error(
        "Wallet payment must be collected via customer app. Use Cash or UPI here.",
      );
      setProcessing(false);
      return;
    }

    const orderIds = selectedTableData?.orders.map((o: any) => o.id) || [];
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid", payment_method: billPaymentMethod })
      .in("id", orderIds);

    if (error) {
      toast.error(error.message);
      setProcessing(false);
      return;
    }

    toast.success(`Bill collected: ₹${selectedTotal}`);
    setSelectedTableId(null);
    setShowUpiQr(false);
    setProcessing(false);
    fetchData();
  };

  if (selectedTableData) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <button
          onClick={() => {
            setSelectedTableId(null);
            setShowUpiQr(false);
          }}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={16} /> Back to Bills
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Table {selectedTableData.table_number} — Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTableData.orders.map((o: any, idx: number) => (
              <div
                key={o.id}
                className="border-t border-slate-100 dark:border-slate-800 pt-3 first:border-t-0 first:pt-0"
              >
                <p className="text-xs font-bold text-slate-400 mb-1">
                  Round {idx + 1}{" "}
                  {o.token_number ? `· Token #${o.token_number}` : ""}
                </p>
                {o.order_items?.map((oi: any) => (
                  <div
                    key={oi.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {oi.restaurant_menu_items?.item_name} x{oi.quantity}
                    </span>
                    <span className="text-slate-500">
                      ₹{oi.price * oi.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
              <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                Total
              </span>
              <span className="font-extrabold text-xl text-primary">
                ₹{selectedTotal}
              </span>
            </div>

            {showUpiQr ? (
              <div className="text-center space-y-3 py-4">
                {upiSessionStatus === "paid" ? (
                  <div className="py-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Payment Received!
                    </p>
                  </div>
                ) : dynamicQrUrl ? (
                  <>
                    <div className="bg-white p-4 rounded-xl inline-block">
                      <img src={dynamicQrUrl} alt="UPI QR" className="w-48" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Waiting for customer to scan and pay ₹{selectedTotal}...
                    </p>
                  </>
                ) : (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-xs text-slate-500 mt-3">
                      Generating QR...
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full h-11"
                  disabled={processing}
                  onClick={handleCollectPayment}
                >
                  {processing
                    ? "Confirming..."
                    : "Confirm UPI Payment Received"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBillPaymentMethod("cod")}
                    className={`py-2 rounded-xl text-sm font-semibold border-2 ${billPaymentMethod === "cod" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => {
                      setBillPaymentMethod("upi");
                      setShowUpiQr(true);
                      handleGenerateDynamicQr(selectedTableData);
                    }}
                    className={`py-2 rounded-xl text-sm font-semibold border-2 ${billPaymentMethod === "upi" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                  >
                    UPI
                  </button>
                </div>
                {billPaymentMethod === "cod" && (
                  <Button
                    className="w-full h-11"
                    disabled={processing}
                    onClick={handleCollectPayment}
                  >
                    {processing
                      ? "Processing..."
                      : `Confirm Cash Received · ₹${selectedTotal}`}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => window.print()}
                >
                  Print Bill
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Receipt size={24} /> Smart POS & Billing
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Tables with pending bills across the restaurant.
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex w-fit">
        <button
          onClick={() => setPosActiveTab("pending")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${posActiveTab === "pending" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Pending Bills
        </button>
        <button
          onClick={() => setPosActiveTab("history")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${posActiveTab === "history" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Bill History
        </button>
      </div>

      {posActiveTab === "history" ? (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">
              Recent Collected Bills
            </h3>
            {historyLoading ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Loading...
              </p>
            ) : billHistory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No bills collected yet.
              </p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Order</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Method</th>
                    <th className="px-3 py-2 font-semibold text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {billHistory.map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {o.token_number
                          ? "#" + o.token_number
                          : o.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-slate-500 capitalize">
                        {o.order_type === "dine_in" ? "Dine-in" : "Online"}
                      </td>
                      <td className="px-3 py-2 text-slate-500 capitalize">
                        {o.payment_method || "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">
                        ₹{o.total?.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : tablesWithBills.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tablesWithBills.map((t) => {
            const total = t.orders.reduce(
              (sum: number, o: any) => sum + (o.total || 0),
              0,
            );
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTableId(t.id)}
                className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    Table {t.table_number}
                  </span>
                  <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {t.orders.length} round{t.orders.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-primary">₹{total}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No pending bills right now.
          </p>
        </div>
      )}
    </div>
  );
};

// 6. Housekeeping
export const HospitalityHousekeeping = () => {
  const { currentTenantId, user } = useAuth();
  const [housekeepingTab, setHousekeepingTab] = useState<
    "rooms" | "laundry" | "lost_found"
  >("rooms");
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchIdHK, setBranchIdHK] = useState<string | null>(null);

  const [laundryItems, setLaundryItems] = useState<any[]>([]);
  const [newLaundryRoom, setNewLaundryRoom] = useState("");
  const [newLaundryDesc, setNewLaundryDesc] = useState("");

  const [lostFoundItems, setLostFoundItems] = useState<any[]>([]);
  const [newLfDesc, setNewLfDesc] = useState("");
  const [newLfLocation, setNewLfLocation] = useState("");

  const fetchRooms = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) {
      setLoading(false);
      return;
    }
    const { data: branchData } = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", currentTenantId)
      .eq("module_key", "hospitality")
      .limit(1)
      .single();
    const bId = branchData?.id;
    setBranchIdHK(bId || null);
    if (!bId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("rooms")
      .select("*, room_types(type_name)")
      .eq("branch_id", bId)
      .eq("is_active", true)
      .order("room_number");
    setRooms(data || []);

    const { data: laundryData } = await supabase
      .from("guest_laundry")
      .select("*")
      .eq("branch_id", bId)
      .order("created_at", { ascending: false });
    setLaundryItems(laundryData || []);

    const { data: lfData } = await supabase
      .from("lost_and_found")
      .select("*")
      .eq("branch_id", bId)
      .order("created_at", { ascending: false });
    setLostFoundItems(lfData || []);

    setLoading(false);
  };

  const handleAddLaundry = async () => {
    if (!newLaundryRoom || !newLaundryDesc || !branchIdHK || !currentTenantId)
      return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("guest_laundry")
      .insert({
        tenant_id: currentTenantId,
        branch_id: branchIdHK,
        room_number: newLaundryRoom,
        item_description: newLaundryDesc,
        status: "pending",
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Laundry item logged");
    setNewLaundryRoom("");
    setNewLaundryDesc("");
    fetchRooms();
  };

  const updateLaundryStatus = async (id: string, status: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from("guest_laundry").update({ status }).eq("id", id);
    fetchRooms();
  };

  const handleAddLostFound = async () => {
    if (!newLfDesc || !branchIdHK || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("lost_and_found")
      .insert({
        tenant_id: currentTenantId,
        branch_id: branchIdHK,
        item_description: newLfDesc,
        found_location: newLfLocation || null,
        status: "unclaimed",
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Item logged");
    setNewLfDesc("");
    setNewLfLocation("");
    fetchRooms();
  };

  const markLfReturned = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("lost_and_found")
      .update({ status: "returned" })
      .eq("id", id);
    fetchRooms();
  };

  useEffect(() => {
    fetchRooms();
  }, [currentTenantId]);

  const updateStatus = async (roomId: string, status: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("rooms")
      .update({
        housekeeping_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Room status updated");
    fetchRooms();
  };

  const dirtyRooms = rooms.filter((r) => r.housekeeping_status === "dirty");
  const inspectedRooms = rooms.filter(
    (r) => r.housekeeping_status === "inspected",
  );
  const cleanRooms = rooms.filter((r) => r.housekeeping_status === "clean");
  const outOfOrderRooms = rooms.filter(
    (r) => r.housekeeping_status === "out_of_order",
  );

  const RoomCard = ({
    room,
    actions,
  }: {
    room: any;
    actions: React.ReactNode;
  }) => (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="font-bold text-slate-900 dark:text-slate-100">
          Room {room.room_number}
        </p>
        <p className="text-xs text-slate-400">{room.room_types?.type_name}</p>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sparkles size={24} /> Housekeeping
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Track and update room cleaning status.
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex w-fit">
        <button
          onClick={() => setHousekeepingTab("rooms")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${housekeepingTab === "rooms" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Room Status
        </button>
        <button
          onClick={() => setHousekeepingTab("laundry")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${housekeepingTab === "laundry" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Guest Laundry
        </button>
        <button
          onClick={() => setHousekeepingTab("lost_found")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${housekeepingTab === "lost_found" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Lost & Found
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
      ) : housekeepingTab === "rooms" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-amber-600 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Needs
                Cleaning ({dirtyRooms.length})
              </h3>
              <div className="space-y-2">
                {dirtyRooms.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No rooms need cleaning.
                  </p>
                ) : (
                  dirtyRooms.map((r) => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      actions={
                        <Button
                          size="sm"
                          onClick={() => updateStatus(r.id, "inspected")}
                        >
                          Mark Cleaned
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{" "}
                Pending Inspection ({inspectedRooms.length})
              </h3>
              <div className="space-y-2">
                {inspectedRooms.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No rooms pending inspection.
                  </p>
                ) : (
                  inspectedRooms.map((r) => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      actions={
                        <Button
                          size="sm"
                          onClick={() => updateStatus(r.id, "clean")}
                        >
                          Approve
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-emerald-600 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
                Clean ({cleanRooms.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cleanRooms.length === 0 ? (
                  <p className="text-sm text-slate-400">No rooms clean.</p>
                ) : (
                  cleanRooms.map((r) => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      actions={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(r.id, "out_of_order")}
                        >
                          Mark Out of Order
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Out of
                Order ({outOfOrderRooms.length})
              </h3>
              <div className="space-y-2">
                {outOfOrderRooms.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No rooms out of order.
                  </p>
                ) : (
                  outOfOrderRooms.map((r) => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      actions={
                        <Button
                          size="sm"
                          onClick={() => updateStatus(r.id, "clean")}
                        >
                          Mark Fixed
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : housekeepingTab === "laundry" ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Room #"
                className="w-24"
                value={newLaundryRoom}
                onChange={(e) => setNewLaundryRoom(e.target.value)}
              />
              <Input
                placeholder="Item description (e.g. 2 towels, 1 shirt)"
                value={newLaundryDesc}
                onChange={(e) => setNewLaundryDesc(e.target.value)}
              />
              <Button
                onClick={handleAddLaundry}
                disabled={!newLaundryRoom || !newLaundryDesc}
              >
                Log
              </Button>
            </div>
            <div className="space-y-2">
              {laundryItems.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No laundry items logged.
                </p>
              ) : (
                laundryItems.map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Room {it.room_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        {it.item_description}
                      </p>
                    </div>
                    {it.status === "pending" ? (
                      <Button
                        size="sm"
                        onClick={() => updateLaundryStatus(it.id, "ready")}
                      >
                        Mark Ready
                      </Button>
                    ) : it.status === "ready" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLaundryStatus(it.id, "delivered")}
                      >
                        Mark Delivered
                      </Button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">
                        Delivered
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Item description"
                value={newLfDesc}
                onChange={(e) => setNewLfDesc(e.target.value)}
              />
              <Input
                placeholder="Found location"
                className="w-40"
                value={newLfLocation}
                onChange={(e) => setNewLfLocation(e.target.value)}
              />
              <Button onClick={handleAddLostFound} disabled={!newLfDesc}>
                Log
              </Button>
            </div>
            <div className="space-y-2">
              {lostFoundItems.length === 0 ? (
                <p className="text-sm text-slate-400">No items logged.</p>
              ) : (
                lostFoundItems.map((it: any) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {it.item_description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {it.found_location || "Location not specified"}
                      </p>
                    </div>
                    {it.status === "unclaimed" ? (
                      <Button size="sm" onClick={() => markLfReturned(it.id)}>
                        Mark Returned
                      </Button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">
                        Returned
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 7. Cloud Kitchen
export const HospitalityCloudKitchen = () => {
  const { currentTenantId } = useAuth();
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [dispatchAssignments, setDispatchAssignments] = useState<any[]>([]);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  const fetchReadyOrders = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, restaurant_menu_items(item_name))")
      .eq("tenant_id", currentTenantId)
      .eq("order_type", "online")
      .in("status", ["New", "Ready to Pack"]);
    if (data) setReadyOrders(data);
  };

  const fetchDispatchAssignments = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const dispatchOrderIds = readyOrders
      .filter((o) => o.status === "Dispatch")
      .map((o) => o.id);
    const { data: dispatchOrders } = await supabase
      .from("orders")
      .select("*, order_items(*, restaurant_menu_items(item_name))")
      .eq("tenant_id", currentTenantId)
      .eq("order_type", "online")
      .eq("status", "Dispatch");
    if (!dispatchOrders || dispatchOrders.length === 0) {
      setDispatchAssignments([]);
      return;
    }
    const orderIds = dispatchOrders.map((o: any) => o.id);
    const { data: assignData } = await supabase
      .from("delivery_assignments")
      .select(
        "*, service_providers(full_name, phone, current_lat, current_lng)",
      )
      .in("order_id", orderIds);
    const merged = dispatchOrders.map((o: any) => ({
      ...o,
      assignment: assignData?.find((a: any) => a.order_id === o.id),
    }));
    setDispatchAssignments(merged);
  };

  const fetchOnlineRiders = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("service_providers")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .eq("is_active", true)
      .eq("is_online", true)
      .ilike("provider_type", "rider");
    if (data) setOnlineRiders(data);
  };

  useEffect(() => {
    fetchReadyOrders();
    fetchOnlineRiders();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("cloud_kitchen_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchReadyOrders(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_assignments" },
        () => fetchDispatchAssignments(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenantId]);

  useEffect(() => {
    fetchDispatchAssignments();
  }, [readyOrders]);

  const handleRejectOnlineOrder = async (orderId: string) => {
    const reason = window.prompt(
      "Reason for rejecting/cancelling this order (optional):",
    );
    if (reason === null) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("cancel_online_food_order", {
      p_order_id: orderId,
      p_reason: reason || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order rejected");
    fetchReadyOrders();
  };

  const handlePrintOrderBill = (order: any) => {
    const itemsHtml =
      order.order_items
        ?.map(
          (oi: any) =>
            `<div style="display:flex;justify-content:space-between;"><span>${oi.restaurant_menu_items?.item_name} x${oi.quantity}</span><span>₹${oi.price * oi.quantity}</span></div>`,
        )
        .join("") || "";
    const subtotal = (order.order_items || []).reduce(
      (s: number, oi: any) => s + oi.price * oi.quantity,
      0,
    );
    const gstHtml =
      order.gst_amount > 0
        ? `<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;"><span>CGST</span><span>₹${(order.cgst_amount || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;"><span>SGST</span><span>₹${(order.sgst_amount || 0).toFixed(2)}</span></div>`
        : "";
    const deliveryHtml =
      order.delivery_charge > 0
        ? `<div style="display:flex;justify-content:space-between;"><span>Delivery Charge</span><span>₹${(order.delivery_charge || 0).toFixed(2)}</span></div>`
        : "";
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(
      `<html><head><title>Order Bill</title></head><body style="font-family:sans-serif;padding:16px;"><h2>Order Bill</h2><p><b>Customer:</b> ${order.customer_name}</p><p><b>Address:</b> ${order.delivery_address}</p><hr/>${itemsHtml}<hr/>${gstHtml}${deliveryHtml}<hr/><p style="font-size:18px;"><b>Total: ₹${order.total}</b></p></body></html>`,
    );
    win.document.close();
    win.print();
  };

  const handleMarkReady = async (orderId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "Ready to Pack" })
      .eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked ready for pickup");
    fetchReadyOrders();
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const order = readyOrders.find((o) => o.id === orderId);
    if (!order) return;
    const { error: assignError } = await supabase
      .from("delivery_assignments")
      .insert({
        order_id: orderId,
        service_provider_id: riderId,
        status: "assigned",
        pickup_address: "Restaurant",
        drop_address: order.delivery_address || "Delivery Address",
        assigned_at: new Date().toISOString(),
      });
    if (assignError) {
      toast.error(assignError.message);
      return;
    }
    await supabase
      .from("orders")
      .update({ status: "Dispatch" })
      .eq("id", orderId);
    toast.success("Rider assigned!");
    setAssigningOrderId(null);
    fetchReadyOrders();
  };

  const newOrders = readyOrders.filter((o) => o.status === "New");
  const readyToPackOrders = readyOrders.filter(
    (o) => o.status === "Ready to Pack",
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Cloud size={24} /> Cloud Kitchen & Delivery
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Online orders ready for pickup and delivery tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">
            New Orders ({newOrders.length})
          </h3>
          <div className="space-y-3">
            {newOrders.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {o.customer_name}
                  </p>
                  <p className="text-xs text-slate-400 mb-2">
                    {o.delivery_address}
                  </p>
                  {o.order_items?.map((oi: any) => (
                    <p
                      key={oi.id}
                      className="text-xs text-slate-600 dark:text-slate-400"
                    >
                      {oi.restaurant_menu_items?.item_name} x{oi.quantity}
                    </p>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleMarkReady(o.id)}
                    >
                      Mark Ready to Pack
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-red-600 border-red-200"
                      onClick={() => handleRejectOnlineOrder(o.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {newOrders.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                No new orders
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">
            Ready to Pack ({readyToPackOrders.length})
          </h3>
          <div className="space-y-3">
            {readyToPackOrders.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {o.customer_name}
                  </p>
                  <p className="text-xs text-slate-400 mb-2">
                    {o.delivery_address}
                  </p>
                  {assigningOrderId === o.id ? (
                    <div className="space-y-2 mt-2">
                      {onlineRiders.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          No riders online
                        </p>
                      ) : (
                        onlineRiders.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleAssignRider(o.id, r.id)}
                            className="w-full text-left text-xs bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg"
                          >
                            {r.full_name}
                          </button>
                        ))
                      )}
                      <button
                        onClick={() => setAssigningOrderId(null)}
                        className="text-xs text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={() => setAssigningOrderId(o.id)}
                      >
                        Assign Rider
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handlePrintOrderBill(o)}
                        >
                          Print Bill
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs text-red-600 border-red-200"
                          onClick={() => handleRejectOnlineOrder(o.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {readyToPackOrders.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                No orders waiting
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">
            Dispatch ({dispatchAssignments.length})
          </h3>
          <div className="space-y-3">
            {dispatchAssignments.map((o: any) => (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {o.customer_name}
                    </p>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      DISPATCHED
                    </span>
                  </div>
                  {o.assignment && (
                    <>
                      <p className="text-xs text-slate-500 mb-1">
                        Assigned to {o.assignment.service_providers?.full_name}
                      </p>
                      {o.assignment.service_providers?.phone && (
                        <a
                          href={`tel:${o.assignment.service_providers.phone}`}
                          className="text-xs text-blue-600 font-semibold underline"
                        >
                          📞 {o.assignment.service_providers.phone}
                        </a>
                      )}
                      {o.assignment.pickup_otp &&
                        o.assignment.status === "assigned" && (
                          <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700 uppercase">
                              Pickup Code
                            </span>
                            <span className="text-lg font-extrabold text-amber-800 tracking-widest">
                              {o.assignment.pickup_otp}
                            </span>
                          </div>
                        )}
                      {(o.assignment.status === "assigned" ||
                        o.assignment.status === "picked_up") && (
                        <div className="mt-3 -mx-4 -mb-4">
                          <LiveTrackingMap
                            deliveryAssignment={o.assignment}
                            destinationAddress={
                              o.assignment.status === "assigned"
                                ? o.assignment.pickup_address
                                : o.assignment.drop_address
                            }
                            statusText={
                              o.assignment.status === "assigned"
                                ? `${(o.assignment.service_providers?.full_name || "Rider").split(" ")[0]} is heading to pick up`
                                : `${(o.assignment.service_providers?.full_name || "Rider").split(" ")[0]} is on the way`
                            }
                            compact={true}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
            {dispatchAssignments.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">
                No active deliveries
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 8. Purchase
export const HospitalityPurchase = () => {
  const { currentTenantId, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"ingredients" | "purchase">(
    "ingredients",
  );
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [newReorder, setNewReorder] = useState("0");
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(true);
  const [showPOModal, setShowPOModal] = useState(false);
  const [receivingPO, setReceivingPO] = useState<any>(null);
  const [poSupplier, setPoSupplier] = useState("");
  const [poItems, setPoItems] = useState<
    { ingredient_id: string; quantity: string; unit_cost: string }[]
  >([]);
  const [branchIdForPO, setBranchIdForPO] = useState<string | null>(null);

  const fetchPurchaseOrders = async () => {
    setPoLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) {
      setPoLoading(false);
      return;
    }
    const { data } = await supabase
      .from("ingredient_purchase_orders")
      .select(
        "*, ingredient_purchase_order_items(*, ingredients(ingredient_name, unit))",
      )
      .eq("tenant_id", currentTenantId)
      .order("created_at", { ascending: false });
    setPurchaseOrders(data || []);
    setPoLoading(false);
  };

  const fetchIngredients = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .eq("is_active", true)
      .order("ingredient_name");
    if (data) setIngredients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchIngredients();
    fetchPurchaseOrders();
  }, [currentTenantId]);

  useEffect(() => {
    const fetchBranch = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", currentTenantId)
        .eq("module_key", "hospitality")
        .limit(1)
        .single();
      setBranchIdForPO(data?.id || null);
    };
    fetchBranch();
  }, [currentTenantId]);

  const handleCreatePO = async () => {
    if (!currentTenantId || !branchIdForPO || poItems.length === 0) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const total = poItems.reduce(
      (s, it) =>
        s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0),
      0,
    );
    const { data: po, error: poErr } = await supabase
      .from("ingredient_purchase_orders")
      .insert({
        tenant_id: currentTenantId,
        branch_id: branchIdForPO,
        po_number: `IPO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        supplier_name: poSupplier || null,
        total_amount: total,
        status: "pending",
      })
      .select()
      .single();
    if (poErr) {
      toast.error(poErr.message);
      return;
    }
    const rows = poItems
      .filter((it) => it.ingredient_id && parseFloat(it.quantity) > 0)
      .map((it) => ({
        purchase_order_id: po.id,
        ingredient_id: it.ingredient_id,
        ordered_quantity: parseFloat(it.quantity),
        unit_cost: parseFloat(it.unit_cost) || 0,
        line_total:
          (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0),
      }));
    const { error: itemsErr } = await supabase
      .from("ingredient_purchase_order_items")
      .insert(rows);
    if (itemsErr) {
      toast.error(itemsErr.message);
      return;
    }
    toast.success("Purchase order created");
    setPoSupplier("");
    setPoItems([]);
    setShowPOModal(false);
    fetchPurchaseOrders();
  };

  const handleReceiveStock = async (poItem: any) => {
    if (!branchIdForPO || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const pending = poItem.ordered_quantity - poItem.received_quantity;
    if (pending <= 0) return;
    const { error } = await supabase.rpc("adjust_ingredient_stock", {
      p_ingredient_id: poItem.ingredient_id,
      p_branch_id: branchIdForPO,
      p_movement_type: "purchase_in",
      p_quantity: pending,
      p_reference_type: "ingredient_purchase_order",
      p_reference_id: poItem.purchase_order_id,
      p_notes: "PO receipt",
      p_created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("ingredient_purchase_order_items")
      .update({ received_quantity: poItem.ordered_quantity })
      .eq("id", poItem.id);
    const { data: allItems } = await supabase
      .from("ingredient_purchase_order_items")
      .select("ordered_quantity, received_quantity")
      .eq("purchase_order_id", poItem.purchase_order_id);
    const allReceived = (allItems || []).every(
      (it: any) => it.received_quantity >= it.ordered_quantity,
    );
    await supabase
      .from("ingredient_purchase_orders")
      .update({ status: allReceived ? "received" : "partially_received" })
      .eq("id", poItem.purchase_order_id);
    toast.success("Stock received");
    fetchPurchaseOrders();
    setReceivingPO(null);
  };

  const handleAddIngredient = async () => {
    if (!newName || !currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("ingredients").insert({
      tenant_id: currentTenantId,
      ingredient_name: newName,
      unit: newUnit,
      reorder_level: parseFloat(newReorder) || 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ingredient added");
    setNewName("");
    setNewUnit("kg");
    setNewReorder("0");
    setShowAddModal(false);
    fetchIngredients();
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!window.confirm("Remove this ingredient?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("ingredients")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ingredient removed");
    fetchIngredients();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package size={24} /> Purchase & Inventory
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Manage raw ingredients, stock, and supplier purchases.
          </p>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex w-fit">
        <button
          onClick={() => setActiveSubTab("ingredients")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "ingredients" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Ingredients Master
        </button>
        <button
          onClick={() => setActiveSubTab("purchase")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "purchase" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Purchase Orders
        </button>
      </div>

      {activeSubTab === "ingredients" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Ingredients ({ingredients.length})
              </h3>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                + Add Ingredient
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                Loading...
              </p>
            ) : ingredients.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No ingredients added yet.
              </p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Ingredient</th>
                    <th className="px-3 py-2 font-semibold">Unit</th>
                    <th className="px-3 py-2 font-semibold">Reorder Level</th>
                    <th className="px-3 py-2 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ingredients.map((ing) => (
                    <tr key={ing.id}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        {ing.ingredient_name}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{ing.unit}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {ing.reorder_level}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDeleteIngredient(ing.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeSubTab === "purchase" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Purchase Orders ({purchaseOrders.length})
              </h3>
              <Button
                size="sm"
                onClick={() => setShowPOModal(true)}
                disabled={ingredients.length === 0}
              >
                + New PO
              </Button>
            </div>
            {ingredients.length === 0 && (
              <p className="text-xs text-amber-600 mb-3">
                Add ingredients first before creating a purchase order.
              </p>
            )}
            {poLoading ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                Loading...
              </p>
            ) : purchaseOrders.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">
                No purchase orders yet.
              </p>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po: any) => (
                  <div
                    key={po.id}
                    className="border border-slate-100 dark:border-slate-800 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {po.po_number}
                        </p>
                        <p className="text-xs text-slate-500">
                          {po.supplier_name || "No supplier"}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${po.status === "received" ? "bg-emerald-100 text-emerald-700" : po.status === "partially_received" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        {po.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {(po.ingredient_purchase_order_items || []).map(
                        (item: any) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-xs text-slate-600 dark:text-slate-400"
                          >
                            <span>
                              {item.ingredients?.ingredient_name} —{" "}
                              {item.received_quantity}/{item.ordered_quantity}{" "}
                              {item.ingredients?.unit}
                            </span>
                            <span>₹{item.line_total}</span>
                          </div>
                        ),
                      )}
                    </div>
                    {po.status !== "received" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceivingPO(po)}
                      >
                        Receive Stock
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Add Ingredient
              </h3>
              <Input
                placeholder="Ingredient name (e.g. Chicken, Onion)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Unit
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm"
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="l">Litre (l)</option>
                  <option value="ml">Millilitre (ml)</option>
                  <option value="pcs">Pieces (pcs)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Reorder Level
                </label>
                <Input
                  type="number"
                  value={newReorder}
                  onChange={(e) => setNewReorder(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddIngredient}
                  disabled={!newName}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md max-h-[85vh] overflow-y-auto">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                New Purchase Order
              </h3>
              <Input
                placeholder="Supplier name (optional)"
                value={poSupplier}
                onChange={(e) => setPoSupplier(e.target.value)}
              />
              <div className="space-y-2">
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={item.ingredient_id}
                      onChange={(e) =>
                        setPoItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, ingredient_id: e.target.value }
                              : it,
                          ),
                        )
                      }
                      className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs"
                    >
                      <option value="">Select ingredient</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.ingredient_name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="w-16 h-9"
                      value={item.quantity}
                      onChange={(e) =>
                        setPoItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, quantity: e.target.value }
                              : it,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      placeholder="₹/unit"
                      className="w-16 h-9"
                      value={item.unit_cost}
                      onChange={(e) =>
                        setPoItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, unit_cost: e.target.value }
                              : it,
                          ),
                        )
                      }
                    />
                    <button
                      onClick={() =>
                        setPoItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPoItems((prev) => [
                      ...prev,
                      { ingredient_id: "", quantity: "", unit_cost: "" },
                    ])
                  }
                >
                  + Add Item
                </Button>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPOModal(false);
                    setPoItems([]);
                    setPoSupplier("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreatePO}
                  disabled={poItems.length === 0}
                >
                  Create PO
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {receivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md max-h-[85vh] overflow-y-auto">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Receive Stock — {receivingPO.po_number}
              </h3>
              {(receivingPO.ingredient_purchase_order_items || []).map(
                (item: any) => {
                  const pending =
                    item.ordered_quantity - item.received_quantity;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-lg p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.ingredients?.ingredient_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.received_quantity}/{item.ordered_quantity}{" "}
                          {item.ingredients?.unit}
                        </p>
                      </div>
                      {pending > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleReceiveStock(item)}
                        >
                          Receive {pending}
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">
                          Received
                        </span>
                      )}
                    </div>
                  );
                },
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setReceivingPO(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 9. Payroll
export const HospitalityPayroll = () => <StaffRolesView />;

const HospitalityPayrollOld = () => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center h-[60vh] flex flex-col items-center justify-center">
    <Users size={48} className="text-primary mb-4" />
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
      Payroll & Duty Management
    </h2>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">
      Staff Master, Shift Roster, Biometric Attendance, and Salary Calculation.
    </p>
  </div>
);

// 10. Finance
export const HospitalityFinanceNew = () => {
  const { currentTenantId } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    "sales" | "gst" | "occupancy"
  >("sales");
  const [dateFrom, setDateFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<{
    total: number;
    gst: number;
    delivery: number;
    count: number;
  }>({ total: 0, gst: 0, delivery: 0, count: 0 });
  const [roomRevenue, setRoomRevenue] = useState(0);
  const [occupancyDays, setOccupancyDays] = useState(0);
  const [totalRoomNights, setTotalRoomNights] = useState(0);

  const fetchReport = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) {
      setLoading(false);
      return;
    }
    const { data: branchData } = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", currentTenantId)
      .eq("module_key", "hospitality")
      .limit(1)
      .single();
    const bId = branchData?.id;
    if (!bId) {
      setLoading(false);
      return;
    }

    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("total, gst_amount, delivery_charge")
      .eq("branch_id", bId)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString());
    const totalSale = (ordersData || []).reduce(
      (s: number, o: any) => s + (o.total || 0),
      0,
    );
    const totalGst = (ordersData || []).reduce(
      (s: number, o: any) => s + (o.gst_amount || 0),
      0,
    );
    const totalDelivery = (ordersData || []).reduce(
      (s: number, o: any) => s + (o.delivery_charge || 0),
      0,
    );
    setSalesData({
      total: totalSale,
      gst: totalGst,
      delivery: totalDelivery,
      count: (ordersData || []).length,
    });

    const { data: bookingsData } = await supabase
      .from("room_bookings")
      .select("total_room_charge, gst_amount, check_in_date, check_out_date")
      .eq("branch_id", bId)
      .eq("status", "checked_out")
      .gte("actual_check_out_at", fromDate.toISOString())
      .lte("actual_check_out_at", toDate.toISOString());
    const totalRoomRev = (bookingsData || []).reduce(
      (s: number, b: any) =>
        s + (b.total_room_charge || 0) + (b.gst_amount || 0),
      0,
    );
    setRoomRevenue(totalRoomRev);

    const { data: allRooms } = await supabase
      .from("rooms")
      .select("id")
      .eq("branch_id", bId)
      .eq("is_active", true);
    const { data: allBookings } = await supabase
      .from("room_bookings")
      .select("check_in_date, check_out_date")
      .eq("branch_id", bId)
      .in("status", ["checked_in", "checked_out"])
      .gte("check_in_date", dateFrom)
      .lte("check_out_date", dateTo);
    const nights = (allBookings || []).reduce(
      (s: number, b: any) =>
        s +
        Math.max(
          1,
          (new Date(b.check_out_date).getTime() -
            new Date(b.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      0,
    );
    setTotalRoomNights(nights);
    const totalDays = Math.max(
      1,
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const availableNights = (allRooms || []).length * totalDays;
    setOccupancyDays(
      availableNights > 0 ? Math.round((nights / availableNights) * 100) : 0,
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [currentTenantId, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PieChart size={24} /> Finance & Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Sales, GST, and Occupancy summaries.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-xs font-semibold text-slate-500">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex w-fit">
        <button
          onClick={() => setActiveSubTab("sales")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "sales" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Sales Summary
        </button>
        <button
          onClick={() => setActiveSubTab("gst")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "gst" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          GST Summary
        </button>
        <button
          onClick={() => setActiveSubTab("occupancy")}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeSubTab === "occupancy" ? "bg-white dark:bg-slate-950 shadow-sm text-primary" : "text-slate-500"}`}
        >
          Occupancy
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Loading report...
        </p>
      ) : activeSubTab === "sales" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                Restaurant Sales
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                ₹{salesData.total.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-400">{salesData.count} orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                Room Revenue
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                ₹{roomRevenue.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-400">Checked-out bookings</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                Grand Total
              </p>
              <p className="text-3xl font-extrabold text-primary">
                ₹{(salesData.total + roomRevenue).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : activeSubTab === "gst" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                Total GST Collected
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                ₹{salesData.gst.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-400">Restaurant orders only</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                CGST (Est.)
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                ₹{(salesData.gst / 2).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                SGST (Est.)
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                ₹{(salesData.gst / 2).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                Occupancy Rate
              </p>
              <p className="text-3xl font-extrabold text-primary">
                {occupancyDays}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">
                Total Room-Nights Sold
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {totalRoomNights}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export const HospitalityFinance = () => <HospitalityFinanceNew />;

const HospitalityFinanceOld = () => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center h-[60vh] flex flex-col items-center justify-center">
    <PieChart size={48} className="text-primary mb-4" />
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
      Financial Reports & Audit
    </h2>
    <p className="text-slate-500 dark:text-slate-400 max-w-md">
      Night Audit, Sales Reports, P&L, GST Reports, and Occupancy Reports.
    </p>
  </div>
);

// 11. Settings
// 15c. Delivery Charge Settings
const DeliveryChargeSettings = () => {
  const { currentTenantId } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [chargeType, setChargeType] = useState<"free" | "fixed" | "percentage">(
    "free",
  );
  const [chargeValue, setChargeValue] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data: branchData } = await supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", currentTenantId)
        .eq("module_key", "hospitality")
        .limit(1)
        .single();
      const bId = branchData?.id;
      setBranchId(bId || null);
      if (!bId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("hospitality_delivery_settings")
        .select("*")
        .eq("branch_id", bId)
        .maybeSingle();
      if (data) {
        setChargeType(data.charge_type);
        setChargeValue(data.charge_value?.toString() || "0");
      }
      setLoading(false);
    };
    fetchSettings();
  }, [currentTenantId]);

  const handleSave = async () => {
    if (!branchId || !currentTenantId) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("hospitality_delivery_settings")
      .upsert(
        {
          tenant_id: currentTenantId,
          branch_id: branchId,
          charge_type: chargeType,
          charge_value: parseFloat(chargeValue) || 0,
        },
        { onConflict: "branch_id" },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Delivery charge settings saved");
  };

  if (loading) return <p className="text-sm text-slate-400 p-4">Loading...</p>;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">
          Delivery Charge (Online Food Orders)
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose how delivery charges are calculated for online food orders.
        </p>
        <div className="space-y-2">
          {[
            { key: "free", label: "Free Delivery" },
            { key: "fixed", label: "Fixed Amount (₹)" },
            { key: "percentage", label: "Percentage of Order (%)" },
          ].map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <input
                type="radio"
                name="chargeType"
                checked={chargeType === opt.key}
                onChange={() => setChargeType(opt.key as any)}
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
        {chargeType !== "free" && (
          <Input
            type="number"
            placeholder={
              chargeType === "fixed" ? "Amount in ₹" : "Percentage (e.g. 5)"
            }
            value={chargeValue}
            onChange={(e) => setChargeValue(e.target.value)}
          />
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export const HospitalitySettings = () => {
  const [activeSubTab, setActiveSubTab] = useState("branches");

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <h2 className="text-xl font-bold mb-4 px-3">Settings</h2>

        <button
          onClick={() => setActiveSubTab("branches")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === "branches"
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <Map size={18} /> Branches
        </button>

        <button
          onClick={() => setActiveSubTab("general")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === "general"
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <Settings size={18} /> Bill Generation
        </button>

        <button
          onClick={() => setActiveSubTab("bill_format")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === "bill_format"
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <Receipt size={18} /> Bill Format
        </button>
        <button
          onClick={() => setActiveSubTab("delivery")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === "delivery"
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <Truck size={18} /> Delivery Charge
        </button>
      </div>

      <div className="flex-1 max-w-4xl">
        
        {activeSubTab === "general" && <SettingsGeneral />}
        {activeSubTab === "delivery" && (
          <div className="animate-in fade-in duration-300">
            <DeliveryChargeSettings />
          </div>
        )}
        {activeSubTab === "bill_format" && (
          <div className="animate-in fade-in duration-300">
            <BillFormatSettings />
          </div>
        )}
      </div>
    </div>
  );
};

// 12. Menu Management
export const HospitalityMenuManagement = () => {
  const { currentTenantId } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [recipeModalItem, setRecipeModalItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({
    category_name: "",
    parent_category_id: "",
  });

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    item_name: "",
    category_id: "",
    price: "",
    description: "",
    is_veg: "true",
    photo: "",
    is_available: true, gst_rate_percent: "5",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchCategories = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("restaurant_menu_categories")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .order("display_order");
    if (data) setCategories(data);
  };

  const fetchItems = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("restaurant_menu_items")
      .select("*")
      .eq("tenant_id", currentTenantId)
      .order("display_order");
    if (data) setItems(data);
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, [currentTenantId]);

  const handlePhotoUpload = async (file: File) => {
    if (!currentTenantId || !file) return;
    setUploadingPhoto(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUploadingPhoto(false);
      return;
    }
    const filePath = `${currentTenantId}/menu-items/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);
    if (uploadError) {
      toast.error(`Photo upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);
    setNewItem((prev) => ({ ...prev, photo: urlData.publicUrl }));
    setUploadingPhoto(false);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newCategory.category_name) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const payload: any = {
      tenant_id: currentTenantId,
      category_name: newCategory.category_name,
      parent_category_id: newCategory.parent_category_id || null,
    };
    let error;
    if (editingCategory) {
      const res = await supabase
        .from("restaurant_menu_categories")
        .update(payload)
        .eq("id", editingCategory.id);
      error = res.error;
    } else {
      const res = await supabase
        .from("restaurant_menu_categories")
        .insert(payload);
      error = res.error;
    }
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    toast.success(editingCategory ? "Category updated" : "Category created");
    setIsAddingCategory(false);
    setEditingCategory(null);
    setNewCategory({ category_name: "", parent_category_id: "" });
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: checkData, error: checkError } = await supabase.rpc(
      "safe_delete_check",
      {
        p_parent_table: "restaurant_menu_categories",
        p_parent_id: id,
        p_child_checks: [
          { table: "restaurant_menu_items", column: "category_id" },
        ],
      },
    );
    if (checkError) {
      toast.error(`Failed to check: ${checkError.message}`);
      return;
    }
    if (!checkData.safe_to_delete) {
      toast.error(
        `Cannot delete: still referenced by ${checkData.blocking_tables.join(", ")}.`,
      );
      return;
    }
    if (!window.confirm("Delete this category?")) return;
    const { error } = await supabase
      .from("restaurant_menu_categories")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success("Category deleted");
    fetchCategories();
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newItem.item_name || !newItem.price) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const payload: any = {
      tenant_id: currentTenantId,
      category_id: newItem.category_id || null,
      item_name: newItem.item_name,
      description: newItem.description || null,
      price: parseFloat(newItem.price) || 0,
      is_veg: newItem.is_veg === "true",
      photo: newItem.photo || null,
      is_available: newItem.is_available,
      gst_rate_percent: parseFloat(newItem.gst_rate_percent) || 0,
    };
    let error;
    if (editingItem) {
      const res = await supabase
        .from("restaurant_menu_items")
        .update(payload)
        .eq("id", editingItem.id);
      error = res.error;
    } else {
      const res = await supabase.from("restaurant_menu_items").insert(payload);
      error = res.error;
    }
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    toast.success(editingItem ? "Item updated" : "Item added");
    setIsAddingItem(false);
    setEditingItem(null);
    setNewItem({
      item_name: "",
      category_id: "",
      price: "",
      description: "",
      is_veg: "true",
      photo: "",
      is_available: true, gst_rate_percent: "0",
    });
    fetchItems();
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewItem({
      item_name: item.item_name || "",
      category_id: item.category_id || "",
      price: item.price?.toString() || "",
      description: item.description || "",
      is_veg: item.is_veg ? "true" : "false",
      photo: item.photo || "",
      is_available: item.is_available !== false,
      gst_rate_percent: item.gst_rate_percent?.toString() || "5",
    });
    setIsAddingItem(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Delete this menu item?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("restaurant_menu_items")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success("Item deleted");
    fetchItems();
  };

  const handleToggleAvailability = async (item: any) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("restaurant_menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchItems();
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      !selectedCategoryId || item.category_id === selectedCategoryId;
    const matchesSearch = item.item_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Menu Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Manage categories, dishes, and availability.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsAddingCategory(true)}
          >
            <Plus size={16} /> Category
          </Button>
          <Button className="gap-2" onClick={() => setIsAddingItem(true)}>
            <Plus size={16} /> Menu Item
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${!selectedCategoryId ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`flex items-center gap-1.5 pl-4 pr-1.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${selectedCategoryId === cat.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          >
            <button
              onClick={() => setSelectedCategoryId(cat.id)}
              className="flex-1 text-left"
            >
              {cat.category_name}
            </button>
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${selectedCategoryId === cat.id ? "hover:bg-white/20" : "hover:bg-red-100 hover:text-red-600"}`}
              title="Delete category"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search menu items..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`border-none shadow-sm overflow-hidden ${!item.is_available ? "opacity-60" : ""}`}
            >
              <div className="h-32 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.item_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UtensilsCrossed size={32} className="text-slate-300" />
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-3 h-3 border-2 rounded-sm ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}
                  >
                    <span
                      className={`block w-1 h-1 rounded-full m-auto mt-[3px] ${item.is_veg ? "bg-emerald-600" : "bg-red-600"}`}
                    />
                  </span>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                    {item.item_name}
                  </h3>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-primary">₹{item.price}</span>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.is_available ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                  >
                    {item.is_available ? "Available" : "Sold Out"}
                  </button>
                </div>
                <div className="flex gap-2 pt-2 border-t dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleEditItem(item)}
                  >
                    <Edit size={12} className="mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setRecipeModalItem(item)}
                  >
                    Recipe
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No menu items found. Click "Menu Item" to add your first dish.
          </p>
        </div>
      )}

      {isAddingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>
                {editingCategory ? "Edit Category" : "New Category"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                  setNewCategory({ category_name: "", parent_category_id: "" });
                }}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Category Name</label>
                  <Input
                    required
                    value={newCategory.category_name}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        category_name: e.target.value,
                      })
                    }
                    placeholder="E.g. Starters, Main Course"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setEditingCategory(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCategory ? "Save" : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>
                {editingItem ? "Edit Menu Item" : "New Menu Item"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddingItem(false);
                  setEditingItem(null);
                  setNewItem({
                    item_name: "",
                    category_id: "",
                    price: "",
                    description: "",
                    is_veg: "true",
                    photo: "",
                    is_available: true, gst_rate_percent: "0",
                  });
                }}
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Photo</label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {newItem.photo ? (
                        <img
                          src={newItem.photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={20} className="text-slate-400" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="menu-item-photo-input"
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          handlePhotoUpload(e.target.files[0]);
                      }}
                    />
                    <label
                      htmlFor="menu-item-photo-input"
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded cursor-pointer"
                    >
                      {uploadingPhoto
                        ? "Uploading..."
                        : newItem.photo
                          ? "Change"
                          : "Upload"}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Item Name</label>
                  <Input
                    required
                    value={newItem.item_name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, item_name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm"
                      value={newItem.category_id}
                      onChange={(e) =>
                        setNewItem({ ...newItem, category_id: e.target.value })
                      }
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Price (₹)</label>
                    <Input
                      required
                      type="number"
                      value={newItem.price}
                      onChange={(e) =>
                        setNewItem({ ...newItem, price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">GST (%)</label>
                    <Input
                      type="number"
                      value={newItem.gst_rate_percent}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          gst_rate_percent: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium">Type:</label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="veg"
                        checked={newItem.is_veg === "true"}
                        onChange={() =>
                          setNewItem({ ...newItem, is_veg: "true" })
                        }
                      />{" "}
                      Veg
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="veg"
                        checked={newItem.is_veg === "false"}
                        onChange={() =>
                          setNewItem({ ...newItem, is_veg: "false" })
                        }
                      />{" "}
                      Non-Veg
                    </label>
                  </div>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newItem.is_available}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          is_available: e.target.checked,
                        })
                      }
                    />{" "}
                    Available
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingItem(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingItem ? "Save" : "Add Item"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      {recipeModalItem && (
        <RecipeModal
          menuItem={recipeModalItem}
          onClose={() => setRecipeModalItem(null)}
        />
      )}
    </div>
  );
};

// 13. Public Table-Order Page (QR Dining)
// 13a. Kiosk Idle Screen (Ads Slideshow + Tap to Order)
const KioskIdleScreen = ({
  ads,
  businessName,
  onTap,
}: {
  ads: any[];
  businessName: string;
  onTap: () => void;
}) => {
  const [currentAd, setCurrentAd] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  return (
    <div
      onClick={onTap}
      className="min-h-screen bg-black flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
    >
      {ads.length > 0 ? (
        <img
          src={ads[currentAd].image_url}
          alt="Ad"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="text-center text-white">
          <Utensils size={64} className="mx-auto mb-4 opacity-50" />
          <h1 className="text-3xl font-extrabold">{businessName}</h1>
        </div>
      )}
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-end pb-20">
        <div className="bg-white/95 backdrop-blur px-8 py-5 rounded-full shadow-2xl animate-pulse">
          <p className="text-xl font-extrabold text-slate-900">
            👆 Tap Anywhere to Order
          </p>
        </div>
      </div>
    </div>
  );
};

// 13b. Kiosk Payment Screen (QR + Real-time Status)
const KioskPaymentScreen = ({
  request,
  businessName,
  onPaid,
  onCancel,
}: {
  request: any;
  businessName: string;
  onPaid: () => void;
  onCancel: () => void;
}) => {
  const [status, setStatus] = useState(request.status);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("kiosk_payment_" + request.id)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallet_payment_requests",
          filter: `id=eq.${request.id}`,
        },
        (payload: any) => {
          if (payload.new.status === "paid") {
            setStatus("paid");
            setTimeout(() => onPaid(), 1000);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [request.id]);

  const payUrl = `${window.location.origin}/wallet-pay?request_id=${request.id}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl text-center">
        <CardContent className="p-8">
          {status === "paid" ? (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Payment Received!
              </h2>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                Scan to Pay
              </h2>
              <p className="text-3xl font-extrabold text-primary mb-4">
                ₹{request.amount}
              </p>
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payUrl)}`}
                  alt="Payment QR"
                  className="w-full"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Scan with your phone camera and pay with BahiBox Coin.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Waiting for payment...
              </div>
              <button
                onClick={onCancel}
                className="text-sm text-slate-500 dark:text-slate-400 font-semibold"
              >
                Cancel
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// 14. Wallet Payment Request Page (QR Scan-to-Pay)
export const WalletPayRequest = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request_id");
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  
  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("wallet_payment_requests")
      .select("*, tenants(business_name)")
      .eq("id", requestId)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setRequest(data);
          setBusinessName(data.tenants?.business_name || "Merchant");
        }
        setLoading(false);
      });
  }, [requestId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Account created!");
    }
    setLoading(false);
  };

  const handlePay = async () => {
    if (!user || !requestId) return;
    setProcessing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setProcessing(false);
      return;
    }
    const { error } = await supabase.rpc("process_wallet_payment_request", {
      p_request_id: requestId,
      p_user_id: user.id,
    });
    if (error) {
      setErrorMsg(error.message);
      setResult("error");
      setProcessing(false);
      return;
    }
    setResult("success");
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!requestId || !request) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Invalid or expired payment link.
      </div>
    );
  }

  if (request.status !== "pending") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Already Paid
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              This payment has already been completed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result === "success") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Payment Successful!
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              ₹{request.amount} paid to {businessName}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Pay {businessName}
              </h2>
              <p className="text-2xl font-extrabold text-primary mt-2">
                ₹{request.amount}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {authMode === "login" ? "Log in" : "Sign up"} to pay with
                BahiBox Coin
              </p>
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              <Input
                required
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <Input
                required
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full h-11"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Log In"
                    : "Sign Up"}
              </Button>
            </form>
            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
              className="w-full text-center text-sm text-primary font-semibold mt-4"
            >
              {authMode === "login"
                ? "New here? Sign up"
                : "Already have an account? Log in"}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardContent className="p-6 text-center">
          <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Pay {businessName}
          </h2>
          <p className="text-3xl font-extrabold text-primary my-4">
            ₹{request.amount}
          </p>
          {result === "error" && (
            <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
          )}
          <Button
            className="w-full h-12"
            disabled={processing}
            onClick={handlePay}
          >
            {processing ? "Processing..." : "Pay with BahiBox Coin"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// 14b. Food Restaurant Menu + Cart + Checkout + Tracking
const FoodRestaurantMenu = ({
  restaurant,
  onBack,
}: {
  restaurant: any;
  onBack: () => void;
}) => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<
    {
      menu_item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }[]
  >([]);
  const [screen, setScreen] = useState<"menu" | "checkout" | "tracking">(
    "menu",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet">("cod");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("restaurant_menu_items")
      .select("*")
      .eq("tenant_id", restaurant.id)
      .eq("is_active", true)
      .eq("is_available", true)
      .then(({ data }: any) => {
        if (data) setMenuItems(data);
      });
    supabase
      .from("restaurant_menu_categories")
      .select("*")
      .eq("tenant_id", restaurant.id)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }: any) => {
        if (data) setMenuCategories(data);
      });
  }, [restaurant.id]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Account created!");
    }
    setLoading(false);
  };

  const addToCart = (item: any) => {
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.menu_item_id === item.id);
      if (existing)
        return prev.map((c: any) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev: any[]) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const filteredMenuItems = activeCategoryId
    ? menuItems.filter((m) => m.category_id === activeCategoryId)
    : menuItems;

  const handleCreateFoodOrder: any = async (selectedPaymentMethod: string) => {
    if (!user || !tenantId || !effectiveTableId || cart.length === 0)
      throw new Error("Cart is empty");
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Connection error");
    const branchRes = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();
    const branchId = branchRes.data?.id;
    if (!branchId) {
      throw new Error("Restaurant setup incomplete");
    }
    const { data, error } = await supabase.rpc("create_food_order", {
      p_tenant_id: tenantId,
      p_branch_id: branchId,
      p_user_id: user.id,
      p_customer_name: user.email || "Guest",
      p_customer_phone: customerPhone,
      p_delivery_address: `Dine-in - Table ${table?.table_number || ""}`,
      p_payment_method: selectedPaymentMethod,
      p_items: cart.map((c) => ({
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
      })),
      p_order_type: "dine_in",
      p_table_id: effectiveTableId,
      p_num_guests: numGuests,
    });
    if (error) {
      throw new Error(error.message);
    }
    return {
      order_id: data.order_id,
      amount_pending: data.amount_pending || 0,
      wallet_amount_used: data.wallet_amount_used || 0,
      total: data.total,
    };
  };

  const handleFoodOrderConfirmed = (result: any) => {
    toast.success("Order placed!");
    setStep("success");
    setShowFoodPaymentSheet(false);
  };

  if (!user && screen !== "menu") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {restaurant.business_name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {authMode === "login" ? "Log in" : "Sign up"} to place order
              </p>
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              <Input
                required
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <Input
                required
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full h-11"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Log In"
                    : "Sign Up"}
              </Button>
            </form>
            <button
              onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
              }
              className="w-full text-center text-sm text-primary font-semibold mt-4"
            >
              {authMode === "login"
                ? "New here? Sign up"
                : "Already have an account? Log in"}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "tracking" && placedOrder) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
            {placedOrder.token_number && (
              <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                #{placedOrder.token_number}
              </p>
            )}
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Order Placed!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Your order from {restaurant.business_name} is being prepared.
              You'll be notified when it's out for delivery.
            </p>
            <Button className="w-full h-11" onClick={onBack}>
              Order Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "checkout") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md mx-auto pt-6 space-y-4">
          <button
            onClick={() => setScreen("menu")}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft size={16} /> Back to Menu
          </button>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Checkout
              </h2>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Delivery Address
                </label>
                <Input
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Full delivery address"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Mobile Number
                </label>
                <Input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${paymentMethod === "cod" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                >
                  Cash on Delivery
                </button>
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${paymentMethod === "wallet" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                >
                  BahiBox Coin
                </button>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Total
                </span>
                <span className="font-extrabold text-lg text-primary">
                  ₹{cartTotal}
                </span>
              </div>
              <Button
                className="w-full h-12"
                disabled={
                  placing || !deliveryAddress || customerPhone.length < 10
                }
                onClick={handlePlaceOrder as any}
              >
                {placing ? "Placing..." : `Place Order · ₹${cartTotal}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-600 dark:text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {restaurant.business_name}
        </h1>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${!activeCategoryId ? "bg-primary text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          >
            All
          </button>
          {menuCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${activeCategoryId === cat.id ? "bg-primary text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find((c) => c.menu_item_id === item.id);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Utensils size={28} className="text-slate-300" />
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 border-2 rounded-sm ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {item.item_name}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary mb-2">
                    ₹{item.price}
                  </p>
                  {inCart ? (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold">{inCart.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => addToCart(item)}
                    >
                      Add
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredMenuItems.length === 0 && (
            <p className="col-span-full text-center text-slate-400 py-8 text-sm">
              No menu items available.
            </p>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
          <Button className="w-full h-12" onClick={() => setScreen("checkout")}>
            Checkout · ₹{cartTotal}
          </Button>
        </div>
      )}
    </div>
  );
};

// 15. Public Food Ordering App (Restaurant List + Menu + Cart + Tracking)
// 16. Consumer Scan & Go — Store Selection
export const ConsumerScanGoStoreSelect = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("branches")
      .select("*, tenants(id, business_name)")
      .eq("is_scan_and_go_active", true)
      .then(({ data }: any) => {
        if (data) {
          const uniqueTenants = Array.from(
            new globalThis.Map(
              data
                .filter((b: any) => b.tenants)
                .map((b: any) => [
                  b.tenants.id,
                  { ...b.tenants, branch_id: b.id, address: b.address },
                ]),
            ).values(),
          );
          setStores(uniqueTenants);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate("/public")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Scan & Go
        </h1>
      </div>
      <div className="p-4 space-y-3">
        {stores.length === 0 ? (
          <p className="text-center text-slate-400 py-16">
            No stores available for Scan & Go right now.
          </p>
        ) : (
          stores.map((s: any) => (
            <button
              key={s.id}
              onClick={() =>
                navigate(
                  `/scan-go/shop?tenant_id=${s.id}&branch_id=${s.branch_id}`,
                )
              }
              className="w-full text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                <ScanLine className="text-indigo-500" size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {s.business_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {s.address}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// 15a0. Food Hero Carousel (Mart-style)
const FoodHeroCarousel = ({
  onCategoryClick,
}: {
  onCategoryClick?: (categoryId: string) => void;
}) => {
  const [banners, setBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("food_banners")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }: any) => {
        if (isMounted && data) setBanners(data);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const banner = banners[currentIndex];

  const handleClick = () => {
    if (
      banner.link_type === "category" &&
      banner.link_value &&
      onCategoryClick
    ) {
      onCategoryClick(banner.link_value);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm">
      <img
        src={banner.image_url}
        alt={banner.title || "Promotional banner"}
        className="w-full h-40 md:h-64 object-cover cursor-pointer"
        onClick={handleClick}
      />
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 15a. Food Category Quick Nav (Mart-style)
export const FoodCategoryQuickNav = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: {
  categories: any[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}) => {
  if (categories.length === 0) return null;
  return (
    <div className="border-b border-white/20 -mx-4 px-4 md:mx-0 md:px-0">
      <div
        className="flex gap-5 overflow-x-auto pb-3 pt-1"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          onClick={() => onSelectCategory(null)}
          className={`text-sm font-semibold whitespace-nowrap pb-1 border-b-2 flex-shrink-0 ${selectedCategoryId === null ? "text-white border-white" : "text-white/70 border-transparent hover:text-white"}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`text-sm font-semibold whitespace-nowrap pb-1 border-b-2 flex-shrink-0 ${selectedCategoryId === cat.id ? "text-white border-white" : "text-white/70 border-transparent hover:text-white"}`}
          >
            {cat.category_name}
          </button>
        ))}
      </div>
    </div>
  );
};

const FoodCategoryGridSection = ({
  categories,
  dishesByCategory,
  onCategoryClick,
}: {
  categories: any[];
  dishesByCategory: Record<string, any[]>;
  onCategoryClick: (categoryId: string) => void;
}) => {
  const categoriesWithDishes = categories.filter(
    (cat) => (dishesByCategory[cat.id] || []).length > 0,
  );
  if (categoriesWithDishes.length === 0) return null;
  const gridGroups: any[][] = [];
  for (let i = 0; i < categoriesWithDishes.length; i += 4) {
    gridGroups.push(categoriesWithDishes.slice(i, i + 4));
  }
  return (
    <div className="space-y-6">
      {gridGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {group.map((cat) => {
            const catDishes = (dishesByCategory[cat.id] || []).slice(0, 4);
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
                  {cat.category_name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {catDishes.map((d: any) => (
                    <div
                      key={d.id}
                      className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center"
                    >
                      {d.photo ? (
                        <img
                          src={d.photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
                  {Array.from({
                    length: Math.max(0, 4 - catDishes.length),
                  }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-lg"
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-3">
                  See more
                </p>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const FoodProductRail = ({
  title,
  dishes,
  onSeeAllClick,
  cart,
  addToCart,
  updateCartQty,
  sponsoredIds,
}: {
  title: string;
  dishes: any[];
  onSeeAllClick?: () => void;
  cart: any[];
  addToCart: (item: any) => void;
  updateCartQty: (id: string, delta: number) => void;
  sponsoredIds: string[];
}) => {
  if (dishes.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {onSeeAllClick && (
          <button
            onClick={onSeeAllClick}
            className="text-sm font-semibold text-blue-600 hover:underline flex-shrink-0"
          >
            See all
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {dishes.map((item: any) => {
          const inCart = cart.find((c: any) => c.menu_item_id === item.id);
          return (
            <Card
              key={item.id}
              className="flex-shrink-0 w-40 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl flex flex-col"
            >
              <div className="h-32 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-3 relative">
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.item_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Utensils size={28} className="text-slate-300" />
                )}
                {sponsoredIds.includes(item.id) && (
                  <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    Sponsored
                  </span>
                )}
              </div>
              <CardContent className="p-3 flex flex-col flex-1">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 line-clamp-1">
                  {item.tenant_name}
                </p>
                <h3 className="font-semibold text-xs line-clamp-2 leading-tight flex-1 text-slate-800 dark:text-slate-200">
                  {item.item_name}
                </h3>
                <span className="font-extrabold text-sm text-primary mt-2">
                  ₹{item.price}
                </span>
                {inCart ? (
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-bold text-xs">{inCart.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => addToCart(item)}
                    className="w-full mt-2 h-7 text-[11px] font-bold rounded-lg"
                  >
                    Add
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const FoodSponsoredBanner = ({
  dishes,
  sponsoredIds,
}: {
  dishes: any[];
  sponsoredIds: string[];
}) => {
  const sponsoredDish = dishes.find((d: any) => sponsoredIds.includes(d.id));
  if (!sponsoredDish) return null;
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4 p-4">
      <span className="absolute top-2 right-2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
        Sponsored
      </span>
      <div className="w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {sponsoredDish.photo ? (
          <img
            src={sponsoredDish.photo}
            alt={sponsoredDish.item_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Utensils size={28} className="text-slate-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {sponsoredDish.tenant_name}
        </p>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">
          {sponsoredDish.item_name}
        </h3>
        <span className="font-extrabold text-primary mt-1 inline-block">
          ₹{sponsoredDish.price}
        </span>
      </div>
    </div>
  );
};

// 15b. Food Dishes Feed (Multi-Restaurant, Zomato-style)
const FoodDishesFeed = ({
  externalCart,
  setExternalCart,
}: { externalCart?: any[]; setExternalCart?: any } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dishes, setDishes] = useState<any[]>([]);
  const [sponsoredIds, setSponsoredIds] = useState<string[]>([]);
  const [foodCategories, setFoodCategories] = useState<any[]>([]);
  const [selectedFoodCategoryId, setSelectedFoodCategoryId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [internalCart, setInternalCart] = useState<
    {
      menu_item_id: string;
      item_name: string;
      price: number;
      quantity: number;
      tenant_id: string;
      tenant_name: string;
    }[]
  >([]);
  const cart = externalCart !== undefined ? externalCart : internalCart;
  const setCart = setExternalCart || setInternalCart;
  const [screen, setScreen] = useState<"feed" | "checkout" | "tracking">(
    "feed",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet">("cod");
  const [placing, setPlacing] = useState(false);
  const [placedTokens, setPlacedTokens] = useState<number[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("food_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }: any) => {
        if (data) setFoodCategories(data);
      });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const fetchDishes = async () => {
      const { data: branchesData } = await supabase
        .from("branches")
        .select("tenant_id, branch_name, tenants(id, business_name)")
        .eq("is_online_store_active", true)
        .eq("module_key", "hospitality");
      if (!branchesData || branchesData.length === 0) {
        setLoading(false);
        return;
      }
      const tenantIds = [...new Set(branchesData.map((b: any) => b.tenant_id))];
      const tenantNameMap = new globalThis.Map(
        branchesData
          .filter((b: any) => b.tenants)
          .map((b: any) => [
            b.tenants.id,
            b.branch_name || b.tenants.business_name,
          ]),
      );

      const { data: itemsData } = await supabase
        .from("restaurant_menu_items")
        .select("*")
        .in("tenant_id", tenantIds)
        .eq("is_active", true)
        .eq("is_available", true);
      const { data: sponsoredData } = await supabase
        .from("food_sponsored_placements")
        .select("menu_item_id")
        .eq("is_active", true);
      const sponsoredSet = new Set(
        (sponsoredData || []).map((s: any) => s.menu_item_id),
      );
      setSponsoredIds(Array.from(sponsoredSet) as string[]);

      const withTenantName = (itemsData || []).map((item: any) => ({
        ...item,
        tenant_name: tenantNameMap.get(item.tenant_id) || "Restaurant",
      }));
      const sorted = withTenantName.sort((a: any, b: any) => {
        const aSponsored = sponsoredSet.has(a.id) ? 1 : 0;
        const bSponsored = sponsoredSet.has(b.id) ? 1 : 0;
        return bSponsored - aSponsored;
      });
      setDishes(sorted);
      setLoading(false);
    };
    fetchDishes();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Account created!");
    }
    setLoading(false);
  };

  const addToCart = (item: any) => {
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.menu_item_id === item.id);
      if (existing)
        return prev.map((c: any) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
          tenant_id: item.tenant_id,
          tenant_name: item.tenant_name,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev: any[]) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const filteredDishes = selectedFoodCategoryId
    ? dishes.filter((d: any) => d.food_category_id === selectedFoodCategoryId)
    : dishes;
  const cartGroups = Array.from(
    new globalThis.Map(cart.map((c) => [c.tenant_id, c.tenant_name])).entries(),
  ).map(([tenantId, tenantName]) => ({
    tenant_id: tenantId,
    tenant_name: tenantName,
    items: cart.filter((c) => c.tenant_id === tenantId),
    subtotal: cart
      .filter((c) => c.tenant_id === tenantId)
      .reduce((s, c) => s + c.price * c.quantity, 0),
  }));

  const dishesByCategory: Record<string, any[]> = {};
  dishes.forEach((d: any) => {
    if (!sponsoredIds.includes(d.id)) return;
    const catId = d.food_category_id || "uncategorized";
    if (!dishesByCategory[catId]) dishesByCategory[catId] = [];
    dishesByCategory[catId].push(d);
  });
  const handleCategoryClick = (categoryId: string) =>
    setSelectedFoodCategoryId(categoryId);

  const handlePlaceOrder: any = async () => {
    if (!user || !deliveryAddress || cart.length === 0) return;
    setPlacing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPlacing(false);
      return;
    }
    const tokens: number[] = [];
    for (const group of cartGroups) {
      const branchRes = await supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", group.tenant_id)
        .eq("module_key", "hospitality")
        .limit(1)
        .single();
      const branchId = branchRes.data?.id;
      if (!branchId) continue;
      const { data, error } = await supabase.rpc("create_food_order", {
        p_tenant_id: group.tenant_id,
        p_branch_id: branchId,
        p_user_id: user.id,
        p_customer_name: user.email || "Guest",
        p_customer_phone: customerPhone,
        p_delivery_address: deliveryAddress,
        p_payment_method: paymentMethod,
        p_items: group.items.map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
        })),
        p_order_type: "online",
      });
      if (error) {
        toast.error(`${group.tenant_name}: ${error.message}`);
        continue;
      }
      if (data?.token_number) tokens.push(data.token_number);
    }
    if (tokens.length === 0) {
      toast.error("Failed to place orders");
      setPlacing(false);
      return;
    }
    toast.success("Orders placed!");
    setPlacedTokens(tokens);
    setScreen("tracking");
    setPlacing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (screen === "tracking") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Orders Placed!
            </h2>
            {placedTokens.length > 0 && (
              <p className="text-slate-500 dark:text-slate-400 mb-2">
                Token{placedTokens.length > 1 ? "s" : ""}:{" "}
                {placedTokens.map((t) => `#${t}`).join(", ")}
              </p>
            )}
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Your order{placedTokens.length > 1 ? "s are" : " is"} being
              prepared.
            </p>
            <Button
              className="w-full h-11"
              onClick={() => {
                setScreen("feed");
                setCart([]);
              }}
            >
              Order Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "checkout") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md mx-auto pt-6 space-y-4">
          <button
            onClick={() => setScreen("feed")}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Checkout
              </h2>
              {cartGroups.map((group) => (
                <div
                  key={group.tenant_id}
                  className="border border-slate-100 dark:border-slate-800 rounded-xl p-3"
                >
                  <p className="text-xs font-bold text-slate-500 mb-1">
                    {group.tenant_name}
                  </p>
                  {group.items.map((it) => (
                    <div
                      key={it.menu_item_id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {it.item_name} x{it.quantity}
                      </span>
                      <span className="text-slate-500">
                        ₹{it.price * it.quantity}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Subtotal</span>
                    <span>₹{group.subtotal}</span>
                  </div>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Delivery Address
                </label>
                <Input
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Full delivery address"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Mobile Number
                </label>
                <Input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${paymentMethod === "cod" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                >
                  Cash on Delivery
                </button>
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${paymentMethod === "wallet" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                >
                  BahiBox Coin
                </button>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Grand Total
                </span>
                <span className="font-extrabold text-lg text-primary">
                  ₹{cartTotal}
                </span>
              </div>
              <Button
                className="w-full h-12"
                disabled={
                  placing || !deliveryAddress || customerPhone.length < 10
                }
                onClick={handlePlaceOrder as any}
              >
                {placing ? "Placing..." : `Place Order · ₹${cartTotal}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <div className="p-4 space-y-8">
        <FoodHeroCarousel onCategoryClick={handleCategoryClick} />
        <FoodCategoryGridSection
          categories={foodCategories}
          dishesByCategory={dishesByCategory}
          onCategoryClick={handleCategoryClick}
        />
        {foodCategories.map((cat: any, idx: number) => {
          const catDishes = dishesByCategory[cat.id] || [];
          if (catDishes.length === 0) return null;
          return (
            <React.Fragment key={cat.id}>
              <FoodProductRail
                title={cat.category_name}
                dishes={catDishes.slice(0, 10)}
                onSeeAllClick={() => handleCategoryClick(cat.id)}
                cart={cart}
                addToCart={addToCart}
                updateCartQty={updateCartQty}
                sponsoredIds={sponsoredIds}
              />
              {idx === 1 && (
                <FoodSponsoredBanner
                  dishes={dishes}
                  sponsoredIds={sponsoredIds}
                />
              )}
            </React.Fragment>
          );
        })}
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-2">
          All Dishes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredDishes.map((item: any) => {
            const inCart = cart.find((c) => c.menu_item_id === item.id);
            const isSponsored = sponsoredIds.includes(item.id);
            return (
              <Card key={item.id} className="overflow-hidden relative">
                {isSponsored && (
                  <span className="absolute top-2 left-2 z-10 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Sponsored
                  </span>
                )}
                <div className="h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Utensils size={28} className="text-slate-300" />
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 border-2 rounded-sm ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {item.item_name}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1 line-clamp-1">
                    {item.tenant_name}
                  </p>
                  <p className="text-sm font-bold text-primary mb-2">
                    ₹{item.price}
                  </p>
                  {inCart ? (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold">{inCart.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => addToCart(item)}
                    >
                      Add
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {dishes.length === 0 && (
            <p className="col-span-full text-center text-slate-400 py-16 text-sm">
              No dishes available right now.
            </p>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
          <Button
            className="w-full h-12"
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setScreen("checkout");
            }}
          >
            Checkout ({cart.length} items) · ₹{cartTotal}
          </Button>
        </div>
      )}
      {showAuthModal && (
        <ConsumerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setScreen("checkout");
          }}
        />
      )}
    </div>
  );
};

export const HospitalityFoodApp = ({
  foodCart,
  setFoodCart,
  embedded,
}: { foodCart?: any[]; setFoodCart?: any; embedded?: boolean } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"dishes" | "restaurants">("dishes");
  const [foodSearchTerm, setFoodSearchTerm] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("branches")
      .select("*, tenants(id, business_name)")
      .eq("is_online_store_active", true)
      .eq("module_key", "hospitality")
      .then(({ data }: any) => {
        if (data) {
          // @ts-ignore
          const uniqueTenants = Array.from(
            new globalThis.Map(
              data
                .filter((b: any) => b.tenants)
                .map((b: any) => [
                  b.tenants.id,
                  {
                    ...b.tenants,
                    business_name: b.branch_name || b.tenants.business_name,
                    address: b.address,
                  },
                ]),
            ).values(),
          );
          setRestaurants(uniqueTenants);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedRestaurant) {
    return (
      <FoodRestaurantMenu
        restaurant={selectedRestaurant}
        onBack={() => setSelectedRestaurant(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-4 -mt-5 relative z-10">
        <div className="relative shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3.5 border-none focus:ring-0 text-[15px] placeholder-slate-400 bg-white text-slate-900"
            placeholder={viewMode === 'restaurants' ? "Search for restaurants, cuisines..." : "Search for dishes..."}
            value={foodSearchTerm}
            onChange={(e) => setFoodSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="px-4 mt-5 flex gap-2">
        <button
          onClick={() => setViewMode('restaurants')}
          className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border ${
            viewMode === 'restaurants'
              ? 'bg-[#ea580c] text-white border-[#ea580c]'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          Search by Restaurant
        </button>
        <button
          onClick={() => setViewMode('dishes')}
          className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border ${
            viewMode === 'dishes'
              ? 'bg-[#ea580c] text-white border-[#ea580c]'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          Search by Dish
        </button>
      </div>

      <div className="p-4 space-y-6">
        {(foodSearchTerm.trim() === '' || viewMode === 'restaurants') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Featured Restaurants</h2>
              <button className="text-sm font-bold text-orange-600">See All &gt;</button>
            </div>
            {restaurants.filter((r: any) => r.business_name.toLowerCase().includes(foodSearchTerm.toLowerCase())).length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No restaurants found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {restaurants.filter((r: any) => r.business_name.toLowerCase().includes(foodSearchTerm.toLowerCase())).slice(0, foodSearchTerm.trim() === '' ? 6 : undefined).map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRestaurant(r)}
                    className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="h-20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Utensils size={28} className="text-slate-300" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{r.business_name}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Star size={11} className="text-amber-500" />
                        <span>4.3</span>
                        <span>•</span>
                        <span>25-30 min</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(foodSearchTerm.trim() === '' || viewMode === 'dishes') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Popular Dishes</h2>
              <button className="text-sm font-bold text-orange-600">See All &gt;</button>
            </div>
            <FoodDishesFeed externalCart={foodCart} setExternalCart={setFoodCart} compactSearchTerm={foodSearchTerm} />
          </div>
        )}
      </div>
    </div>
  );
};

// 16b. Reusable Barcode Scanner Modal
export const BarcodeScannerModal = ({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: any = null;
    let animationFrame: number;
    let stopped = false;

    const start = async () => {
      if (!("BarcodeDetector" in window)) {
        setSupported(false);
        return;
      }
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scanLoop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !stopped) {
              stopped = true;
              onDetect(codes[0].rawValue);
              return;
            }
          } catch (e) {
            /* ignore detection errors, keep scanning */
          }
          animationFrame = requestAnimationFrame(scanLoop);
        };
        scanLoop();
      } catch (e: any) {
        setError(
          "Camera access denied or unavailable. Please use manual entry below.",
        );
      }
    };
    start();

    return () => {
      stopped = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            Scan Product
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        {supported ? (
          <div className="relative bg-black aspect-square">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <div className="absolute inset-8 border-2 border-white/70 rounded-xl pointer-events-none" />
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500">
            Camera scanning not supported on this device. Please use manual
            entry below.
          </div>
        )}
        {error && <p className="text-xs text-red-600 px-4 pt-2">{error}</p>}
        <div className="p-4 space-y-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-500">
            Or Enter Barcode Manually
          </label>
          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter barcode number"
            />
            <Button
              onClick={() => manualCode && onDetect(manualCode)}
              disabled={!manualCode}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 16c. Consumer Scan & Go — Shop Page (Camera Scan + Cart + Checkout + Gate Pass)
export const ConsumerScanGoShop = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenant_id");
  const branchId = searchParams.get("branch_id");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState("");
  const [cart, setCart] = useState<
    {
      product_id: string;
      product_name: string;
      barcode: string;
      selling_price: number;
      photo: string | null;
      quantity: number;
    }[]
  >([]);
  const [showScanner, setShowScanner] = useState(false);
  const [screen, setScreen] = useState<"shop" | "checkout" | "success">("shop");
  const [placing, setPlacing] = useState(false);
  const [gatePassData, setGatePassData] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !tenantId) return;
    supabase
      .from("tenants")
      .select("business_name")
      .eq("id", tenantId)
      .single()
      .then(({ data }: any) => {
        if (data) setStoreName(data.business_name);
      });
  }, [tenantId]);

  const handleBarcodeDetected = async (code: string) => {
    setShowScanner(false);
    const supabase = getSupabaseClient();
    if (!supabase || !tenantId) return;
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("barcode", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!product) {
      toast.error("Product not found for this barcode.");
      return;
    }
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.product_id === product.id);
      if (existing)
        return prev.map((c: any) =>
          c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.product_name,
          barcode: product.barcode,
          selling_price: product.selling_price,
          photo: product.photo,
          quantity: 1,
        },
      ];
    });
    toast.success(`${product.product_name} added to cart`);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev: any[]) =>
      prev
        .map((c) =>
          c.product_id === productId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce(
    (sum, c) => sum + c.selling_price * c.quantity,
    0,
  );

  const handlePlaceOrder: any = async () => {
    if (!user || cart.length === 0 || !tenantId || !branchId) return;
    setPlacing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPlacing(false);
      return;
    }
    const { data, error } = await supabase.rpc("create_scan_and_go_order", {
      p_tenant_id: tenantId,
      p_branch_id: branchId,
      p_customer_id: user.id,
      p_seller_state_code: null,
      p_buyer_state_code: null,
      p_items: cart.map((c) => ({
        product_id: c.product_id,
        quantity: c.quantity,
        discount_type: "none",
        discount_value: 0,
      })),
      p_payment_method: "wallet",
    });
    setPlacing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setGatePassData(data);
    setScreen("success");
  };

  if (!user && screen === "checkout") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6 text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Please log in to checkout.
            </p>
            <Button className="w-full" onClick={() => setShowAuthModal(true)}>
              Log In
            </Button>
          </CardContent>
        </Card>
        {showAuthModal && (
          <ConsumerAuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}
      </div>
    );
  }

  if (screen === "success" && gatePassData) {
    const gatePassUrl = `bahibox-gatepass:${gatePassData.invoice_id}`;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 mb-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              Payment Successful!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Show this Gate Pass QR at the exit.
            </p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(gatePassUrl)}`}
              alt="Gate Pass QR"
              className="mx-auto rounded-xl border border-slate-200 dark:border-slate-800"
            />
            <p className="text-xs text-slate-400 mt-3">
              Invoice: {gatePassData.invoice_number}
            </p>
            <p className="text-lg font-extrabold text-primary mt-1">
              ₹{gatePassData.amount}
            </p>
            <Button
              className="w-full h-11 mt-6"
              onClick={() => navigate("/public")}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "checkout") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md mx-auto pt-6 space-y-4">
          <button
            onClick={() => setScreen("shop")}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft size={16} /> Back to Shop
          </button>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Checkout
              </h2>
              {cart.map((c) => (
                <div
                  key={c.product_id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {c.product_name} x{c.quantity}
                  </span>
                  <span className="text-slate-500">
                    ₹{c.selling_price * c.quantity}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Total
                </span>
                <span className="font-extrabold text-lg text-primary">
                  ₹{cartTotal}
                </span>
              </div>
              <Button
                className="w-full h-12"
                disabled={placing}
                onClick={handlePlaceOrder as any}
              >
                {placing ? "Processing..." : `Pay with Wallet · ₹${cartTotal}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate("/scan-go")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {storeName || "Scan & Go"}
        </h1>
      </div>
      <div className="p-4 space-y-4">
        <Button
          className="w-full h-14 text-base"
          onClick={() => setShowScanner(true)}
        >
          <ScanLine className="mr-2" size={20} /> Scan Product
        </Button>
        {cart.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">
            Cart is empty. Scan a product to begin.
          </p>
        ) : (
          <div className="space-y-3">
            {cart.map((c) => (
              <Card key={c.product_id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {c.photo ? (
                      <img
                        src={c.photo}
                        alt={c.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {c.product_name}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      ₹{c.selling_price}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(c.product_id, -1)}
                      className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold w-5 text-center">
                      {c.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(c.product_id, 1)}
                      className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
          <Button
            className="w-full h-12"
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setScreen("checkout");
            }}
          >
            Generate Bill ({cart.length} items) · ₹{cartTotal}
          </Button>
        </div>
      )}
      {showScanner && (
        <BarcodeScannerModal
          onDetect={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
      {showAuthModal && (
        <ConsumerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setScreen("checkout");
          }}
        />
      )}
    </div>
  );
};

// 16d. Food Cart Checkout (Standalone, for Public-App Cart tab)
export const FoodCartCheckout = ({
  foodCart,
  setFoodCart,
}: {
  foodCart: any[];
  setFoodCart: (v: any[]) => void;
}) => {
  const { user } = useAuth();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placedTokens, setPlacedTokens] = useState<number[]>([]);
  const [screen, setScreen] = useState<"cart" | "success">("cart");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchDefaultAddress = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from("consumer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      if (data) {
        setDeliveryAddress(
          `${data.address_line}, ${data.city}, ${data.state} - ${data.pincode}`,
        );
        if (data.contact_phone) setCustomerPhone(data.contact_phone);
      }
    };
    fetchDefaultAddress();
  }, [user]);

  const updateQty = (menuItemId: string, delta: number) => {
    setFoodCart(
      foodCart
        .map((c) =>
          c.menu_item_id === menuItemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = foodCart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartGroups = Array.from(
    new globalThis.Map(
      foodCart.map((c) => [c.tenant_id, c.tenant_name]),
    ).entries(),
  ).map(([tenantId, tenantName]) => ({
    tenant_id: tenantId,
    tenant_name: tenantName,
    items: foodCart.filter((c) => c.tenant_id === tenantId),
    subtotal: foodCart
      .filter((c) => c.tenant_id === tenantId)
      .reduce((s, c) => s + c.price * c.quantity, 0),
  }));

  const handleOpenFoodPaymentSheet = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!deliveryAddress || foodCart.length === 0) {
      toast.error("Please enter a delivery address");
      return;
    }
    setShowPaymentSheet(true);
  };

  const handleCreateFoodOrders = async (selectedPaymentMethod: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) throw new Error("Please login to continue");
    const orderIds: string[] = [];
    const tokens: number[] = [];
    let combinedTotal = 0;
    let combinedWalletUsed = 0;
    let combinedPending = 0;

    for (const group of cartGroups) {
      const branchRes = await supabase
        .from("branches")
        .select("id")
        .eq("tenant_id", group.tenant_id)
        .eq("module_key", "hospitality")
        .limit(1)
        .single();
      const branchId = branchRes.data?.id;
      if (!branchId) continue;
      const { data, error } = await supabase.rpc("create_food_order", {
        p_tenant_id: group.tenant_id,
        p_branch_id: branchId,
        p_user_id: user.id,
        p_customer_name: user.email || "Guest",
        p_customer_phone: customerPhone,
        p_delivery_address: deliveryAddress,
        p_payment_method: selectedPaymentMethod,
        p_items: group.items.map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
        })),
        p_order_type: "online",
      });
      if (error) {
        toast.error(`${group.tenant_name}: ${error.message}`);
        continue;
      }
      if (data?.order_id) orderIds.push(data.order_id);
      if (data?.token_number) tokens.push(data.token_number);
      combinedTotal += data?.total || 0;
      combinedWalletUsed += data?.wallet_amount_used || 0;
      combinedPending += data?.amount_pending || 0;
    }

    if (orderIds.length === 0) {
      throw new Error("Failed to place orders");
    }

    return {
      order_id: orderIds[0],
      order_ids: orderIds,
      total: combinedTotal,
      wallet_amount_used: combinedWalletUsed,
      amount_pending: combinedPending,
      tokens,
    };
  };

  const handleFoodPaymentConfirmed = (result: any) => {
    toast.success("Orders placed!");
    setPlacedTokens(result.tokens || []);
    setFoodCart([]);
    setScreen("success");
    setShowPaymentSheet(false);
  };

  if (screen === "success") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Orders Placed!
          </h2>
          {placedTokens.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Token{placedTokens.length > 1 ? "s" : ""}:{" "}
              {placedTokens.map((t) => `#${t}`).join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (foodCart.length === 0) {
    return (
      <p className="text-center text-slate-400 py-16 text-sm">
        Your food cart is empty.
      </p>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {cartGroups.map((group) => (
        <div
          key={group.tenant_id}
          className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950"
        >
          <p className="text-xs font-bold text-slate-500 mb-2">
            {group.tenant_name}
          </p>
          {group.items.map((it) => (
            <div
              key={it.menu_item_id}
              className="flex items-center justify-between text-sm mb-1"
            >
              <span className="text-slate-700 dark:text-slate-300">
                {it.item_name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(it.menu_item_id, -1)}
                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                >
                  <Minus size={12} />
                </button>
                <span className="font-bold w-4 text-center">{it.quantity}</span>
                <button
                  onClick={() => updateQty(it.menu_item_id, 1)}
                  className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Subtotal</span>
            <span>₹{group.subtotal}</span>
          </div>
        </div>
      ))}

      {!user ? (
        <Button className="w-full h-11" onClick={() => setShowAuthModal(true)}>
          Log In to Checkout
        </Button>
      ) : (
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Delivery Address
            </label>
            <Input
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Full delivery address"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Mobile Number
            </label>
            <Input
              required
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Grand Total
            </span>
            <span className="font-extrabold text-lg text-primary">
              ₹{cartTotal}
            </span>
          </div>
          <Button
            className="w-full h-12"
            disabled={!deliveryAddress || customerPhone.length < 10}
            onClick={handleOpenFoodPaymentSheet}
          >
            {`Place Order · ₹${cartTotal}`}
          </Button>
        </div>
      )}
      {showAuthModal && (
        <ConsumerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
      {cartGroups.length > 0 && (
        <PaymentBottomSheet
          isOpen={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          amount={cartTotal}
          tenantId={cartGroups[0].tenant_id}
          branchId={null}
          onCreateOrder={handleCreateFoodOrders}
          onPaymentConfirmed={handleFoodPaymentConfirmed}
        />
      )}
    </div>
  );
};

// 16e. Recipe Modal (BOM Builder for Menu Items)
const RecipeModal = ({
  menuItem,
  onClose,
}: {
  menuItem: any;
  onClose: () => void;
}) => {
  const { currentTenantId } = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipeMap, setRecipeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data: ingData } = await supabase
        .from("ingredients")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .eq("is_active", true)
        .order("ingredient_name");
      if (ingData) setIngredients(ingData);

      const { data: recipeData } = await supabase
        .from("menu_item_recipes")
        .select("*")
        .eq("menu_item_id", menuItem.id);
      const map: Record<string, string> = {};
      (recipeData || []).forEach((r: any) => {
        map[r.ingredient_id] = r.quantity_per_serving.toString();
      });
      setRecipeMap(map);
      setLoading(false);
    };
    fetchData();
  }, [menuItem.id, currentTenantId]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSaving(false);
      return;
    }

    await supabase
      .from("menu_item_recipes")
      .delete()
      .eq("menu_item_id", menuItem.id);

    const rows = Object.entries(recipeMap)
      .filter(([_, qty]) => qty && parseFloat(qty) > 0)
      .map(([ingredientId, qty]) => ({
        menu_item_id: menuItem.id,
        ingredient_id: ingredientId,
        quantity_per_serving: parseFloat(qty),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("menu_item_recipes").insert(rows);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success("Recipe saved");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Recipe
            </h3>
            <p className="text-xs text-slate-500">{menuItem.item_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Loading...
            </p>
          ) : ingredients.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No ingredients found. Add ingredients in Purchase & Inventory
              first.
            </p>
          ) : (
            ingredients.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                  {ing.ingredient_name}
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24 h-9"
                    placeholder="0"
                    value={recipeMap[ing.id] || ""}
                    onChange={(e) =>
                      setRecipeMap((prev) => ({
                        ...prev,
                        [ing.id]: e.target.value,
                      }))
                    }
                  />
                  <span className="text-xs text-slate-400 w-8">{ing.unit}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            className="w-full h-11"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Recipe"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// 16f. Consumer Hotel Selection (for online room booking)
export const ConsumerHotelSelect = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("branches")
      .select("*, tenants(id, business_name)")
      .eq("is_online_booking_active", true)
      .eq("module_key", "hospitality")
      .then(({ data }: any) => {
        if (data) {
          const uniqueTenants = Array.from(
            new globalThis.Map(
              data
                .filter((b: any) => b.tenants)
                .map((b: any) => [
                  b.tenants.id,
                  {
                    ...b.tenants,
                    business_name: b.branch_name || b.tenants.business_name,
                    branch_id: b.id,
                    address: b.address,
                  },
                ]),
            ).values(),
          );
          setHotels(uniqueTenants);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate("/public")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Book a Stay
        </h1>
      </div>
      <div className="p-4 space-y-3">
        {hotels.length === 0 ? (
          <p className="text-center text-slate-400 py-16">
            No hotels available for online booking right now.
          </p>
        ) : (
          hotels.map((h: any) => (
            <button
              key={h.id}
              onClick={() =>
                navigate(
                  `/stay/hotel?tenant_id=${h.id}&branch_id=${h.branch_id}`,
                )
              }
              className="w-full text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Bed className="text-purple-500" size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {h.business_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {h.address}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// 16g. Consumer Hotel Booking (Room browse + dates + checkout)
export const ConsumerHotelBooking = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenant_id");
  const branchId = searchParams.get("branch_id");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [hotelName, setHotelName] = useState("");
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState("1");
  const [booking, setBooking] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !tenantId || !branchId) return;
    supabase
      .from("tenants")
      .select("business_name")
      .eq("id", tenantId)
      .single()
      .then(({ data }: any) => {
        if (data) setHotelName(data.business_name);
      });
    supabase
      .from("room_types")
      .select("*")
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .order("base_price")
      .then(({ data }: any) => {
        setRoomTypes(data || []);
        setLoading(false);
      });
  }, [tenantId, branchId]);

  const nights =
    checkInDate && checkOutDate
      ? Math.max(
          1,
          (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  const totalAmount = selectedType ? nights * selectedType.base_price : 0;

  const handleOpenBookingPaymentSheet = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (
      !selectedType ||
      !checkInDate ||
      !checkOutDate ||
      !guestName ||
      !tenantId ||
      !branchId
    )
      return;
    setShowPaymentSheet(true);
  };

  const handleCreateBooking = async (selectedPaymentMethod: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) throw new Error('Please login to continue');
    const { data, error } = await supabase.rpc("create_online_room_booking", {
      p_tenant_id: tenantId,
      p_branch_id: branchId,
      p_room_type_id: selectedType.id,
      p_customer_user_id: user.id,
      p_guest_name: guestName,
      p_guest_phone: guestPhone || null,
      p_check_in_date: checkInDate,
      p_check_out_date: checkOutDate,
      p_num_guests: parseInt(numGuests) || 1,
      p_payment_method: selectedPaymentMethod,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  const handleBookingPaymentConfirmed = (result: any) => {
    toast.success("Booking confirmed!");
    setConfirmedBooking(result);
    setShowPaymentSheet(false);
  };

  if (confirmedBooking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 mb-3" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              Booking Confirmed!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {hotelName}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {checkInDate} → {checkOutDate} · {confirmedBooking.nights}{" "}
              night(s)
            </p>
            <p className="text-lg font-extrabold text-primary mt-2">
              ₹{confirmedBooking.total_amount}
            </p>
            <Button
              className="w-full h-11 mt-6"
              onClick={() => navigate("/public")}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-8">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate("/stay")}
          className="text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {hotelName || "Book a Stay"}
        </h1>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500">
                  Check-in
                </label>
                <Input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500">
                  Check-out
                </label>
                <Input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                Guests
              </label>
              <Input
                type="number"
                value={numGuests}
                onChange={(e) => setNumGuests(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-center text-slate-400 py-8">
            Loading room types...
          </p>
        ) : roomTypes.length === 0 ? (
          <p className="text-center text-slate-400 py-8">
            No room types available.
          </p>
        ) : (
          <div className="space-y-3">
            {roomTypes.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setSelectedType(rt)}
                className={`w-full text-left bg-white dark:bg-slate-950 border-2 rounded-xl p-4 transition-colors ${selectedType?.id === rt.id ? "border-primary" : "border-slate-200 dark:border-slate-800"}`}
              >
                {rt.photos && rt.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {rt.photos
                      .slice(0, 4)
                      .map((photo: string, pIdx: number) => (
                        <div
                          key={pIdx}
                          className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900"
                        >
                          <img
                            src={photo}
                            alt={rt.type_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {rt.type_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Max {rt.max_occupancy} guests
                    </p>
                  </div>
                  <p className="font-extrabold text-primary">
                    ₹{rt.base_price}
                    <span className="text-xs font-normal text-slate-400">
                      /night
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedType && checkInDate && checkOutDate && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <Input
                placeholder="Phone number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Total ({nights} night{nights > 1 ? "s" : ""})
                </span>
                <span className="font-extrabold text-lg text-primary">
                  ₹{totalAmount}
                </span>
              </div>
              <Button
                className="w-full h-12"
                onClick={handleOpenBookingPaymentSheet}
                disabled={!guestName}
              >
                {`Book Now · ₹${totalAmount}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {showAuthModal && (
        <ConsumerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
      {tenantId && selectedType && (
        <PaymentBottomSheet
          isOpen={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          amount={totalAmount}
          tenantId={tenantId}
          branchId={branchId || null}
          onCreateOrder={handleCreateBooking}
          onPaymentConfirmed={handleBookingPaymentConfirmed}
        />
      )}
    </div>
  );
};

// 16h. Room Folio Order Modal (Bill to Room)
const RoomFolioOrderModal = ({
  booking,
  onClose,
}: {
  booking: any;
  onClose: () => void;
}) => {
  const { currentTenantId, user } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<
    {
      menu_item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase
        .from("restaurant_menu_items")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .eq("is_available", true)
        .order("item_name");
      setMenuItems(data || []);
      setLoading(false);
    };
    fetchMenu();
  }, [currentTenantId]);

  const addToCart = (item: any) => {
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.menu_item_id === item.id);
      if (existing)
        return prev.map((c: any) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev: any[]) =>
      prev
        .map((c) =>
          c.menu_item_id === id
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handlePlaceOrder: any = async () => {
    if (cart.length === 0 || !currentTenantId || !user) return;
    setPlacing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPlacing(false);
      return;
    }
    const { error } = await supabase.rpc("create_food_order", {
      p_tenant_id: currentTenantId,
      p_branch_id: booking.branch_id,
      p_user_id: user.id,
      p_customer_name: booking.guest_name,
      p_customer_phone: booking.guest_phone,
      p_delivery_address: `Room ${booking.rooms?.room_number}`,
      p_payment_method: "room_bill",
      p_items: cart.map((c) => ({
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
      })),
      p_order_type: "online",
      p_room_booking_id: booking.id,
    });
    setPlacing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order billed to room");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Order Food — Room {booking.rooms?.room_number}
            </h3>
            <p className="text-xs text-slate-500">{booking.guest_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Loading menu...
            </p>
          ) : menuItems.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No menu items available.
            </p>
          ) : (
            menuItems.map((item) => {
              const inCart = cart.find((c) => c.menu_item_id === item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.item_name}
                    </p>
                    <p className="text-xs text-primary font-bold">
                      ₹{item.price}
                    </p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold w-4 text-center">
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(item)}>
                      Add
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Total
            </span>
            <span className="font-extrabold text-lg text-primary">
              ₹{cartTotal}
            </span>
          </div>
          <Button
            className="w-full h-11"
            onClick={handlePlaceOrder as any}
            disabled={placing || cart.length === 0}
          >
            {placing ? "Placing..." : "Bill to Room"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const HospitalityTableOrder = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenant_id");
  const tableId = searchParams.get("table_id");
  const isKioskMode = !tableId;
  const { user } = useAuth();

  const [table, setTable] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<
    {
      menu_item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }[]
  >([]);
  const [numGuests, setNumGuests] = useState(1);
  const [showFoodPaymentSheet, setShowFoodPaymentSheet] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [billPaymentMethod, setBillPaymentMethod] = useState<"cod" | "wallet">(
    "cod",
  );
  const [payingBill, setPayingBill] = useState(false);
  const [step, setStep] = useState<
    "idle" | "guests" | "menu" | "payment" | "table_select" | "success"
  >(isKioskMode ? "idle" : "guests");
  const [kioskAds, setKioskAds] = useState<any[]>([]);

  useEffect(() => {
    if (!isKioskMode || !tenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("kiosk_ads")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }: any) => {
        if (data) setKioskAds(data);
      });
  }, [isKioskMode, tenantId]);
  const [kioskPaymentRequest, setKioskPaymentRequest] = useState<any>(null);
  const [creatingPaymentRequest, setCreatingPaymentRequest] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet">("cod");
  const [placing, setPlacing] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isAnonymousUser = !!(user as any)?.is_anonymous;
  const [kioskTables, setKioskTables] = useState<any[]>([]);
  const [selectedKioskTableId, setSelectedKioskTableId] = useState<
    string | null
  >(null);
  const effectiveTableId = tableId || selectedKioskTableId;

  useEffect(() => {
    if (!isKioskMode || !tenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("restaurant_tables")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("table_number")
      .then(({ data }: any) => {
        if (data) setKioskTables(data);
      });
  }, [isKioskMode, tenantId]);

  const handleUpgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("Account created! You can now pay with BahiBox Coin.");
    setShowUpgradeModal(false);
    setLoading(false);
  };

  const handleWalletClick = (setter: (v: any) => void) => {
    if (isAnonymousUser) {
      setShowUpgradeModal(true);
    } else {
      setter("wallet");
    }
  };
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWalletAuthForm, setShowWalletAuthForm] = useState(false);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }: any) => {
      if (!data?.session) {
        supabase.auth.signInAnonymously();
      }
    });
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !effectiveTableId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const fetchAll = async () => {
      const { data: tableData } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("id", effectiveTableId)
        .single();
      if (tableData) setTable(tableData);

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("id", tenantId)
        .single();
      if (tenantData) setBusinessName(tenantData.business_name);

      const { data: itemsData } = await supabase
        .from("restaurant_menu_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .eq("is_available", true);
      if (itemsData) setMenuItems(itemsData);

      const { data: catsData } = await supabase
        .from("restaurant_menu_categories")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("display_order");
      if (catsData) setMenuCategories(catsData);

      if (user) {
        const { data: tableData2 } = await supabase
          .from("restaurant_tables")
          .select("last_reset_at")
          .eq("id", effectiveTableId)
          .single();
        if (tableData2) {
          const { data: existingOrders } = await supabase
            .from("orders")
            .select("id")
            .eq("table_id", effectiveTableId)
            .eq("user_id", user.id)
            .neq("status", "Cancelled")
            .gte("created_at", tableData2.last_reset_at)
            .limit(1);
          if (existingOrders && existingOrders.length > 0) {
            setStep("success");
          }
        }
      }
    };
    fetchAll();
  }, [tenantId, effectiveTableId, user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Account created!");
    }
    setLoading(false);
  };

  const addToCart = (item: any) => {
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c: any) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev: any[]) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const fetchMyOrders = async () => {
    if (!effectiveTableId || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: tableData } = await supabase
      .from("restaurant_tables")
      .select("last_reset_at")
      .eq("id", effectiveTableId)
      .single();
    if (!tableData) return;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, order_items(*, restaurant_menu_items(item_name)), kitchen_order_tickets(status)",
      )
      .eq("table_id", effectiveTableId)
      .eq("user_id", user.id)
      .neq("status", "Cancelled")
      .gte("created_at", tableData.last_reset_at)
      .order("created_at", { ascending: true });
    console.log(
      "DEBUG tableData:",
      JSON.stringify(tableData),
      "error:",
      JSON.stringify(error),
    );
    if (data) setMyOrders(data);
  };

  useEffect(() => {
    if (step !== "menu" && step !== "success") return;
    fetchMyOrders();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("my_table_orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kitchen_order_tickets" },
        () => fetchMyOrders(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchMyOrders(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, effectiveTableId, user]);

  const unpaidTotal = myOrders
    .filter((o) => o.payment_status === "unpaid")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  console.log("DEBUG myOrders:", JSON.stringify(myOrders));

  const handlePayBill = async () => {
    if (!user || !effectiveTableId) return;
    setPayingBill(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPayingBill(false);
      return;
    }
    const { data, error } = await supabase.rpc("pay_table_bill", {
      p_table_id: effectiveTableId,
      p_user_id: user.id,
      p_payment_method: billPaymentMethod,
    });
    if (error) {
      toast.error(error.message);
      setPayingBill(false);
      return;
    }
    toast.success(`Bill paid: ₹${data.total}`);
    setPayingBill(false);
    fetchMyOrders();
  };
  const filteredMenuItems = activeCategoryId
    ? menuItems.filter((m) => m.category_id === activeCategoryId)
    : menuItems;

  const handleKioskCheckout = async () => {
    if (!tenantId || cart.length === 0) return;
    setCreatingPaymentRequest(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setCreatingPaymentRequest(false);
      return;
    }
    const { data, error } = await supabase
      .from("wallet_payment_requests")
      .insert({
        tenant_id: tenantId,
        amount: cartTotal,
        reference_note: "Kiosk order",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setCreatingPaymentRequest(false);
      return;
    }
    setKioskPaymentRequest(data);
    setStep("payment");
    setCreatingPaymentRequest(false);
  };

  const finalizeKioskOrder = async (chosenTableId: string) => {
    if (!user || !tenantId || !chosenTableId || cart.length === 0) return;
    setPlacing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPlacing(false);
      return;
    }
    const branchRes = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();
    const branchId = branchRes.data?.id;
    if (!branchId) {
      toast.error("Restaurant setup incomplete");
      setPlacing(false);
      return;
    }
    const { data, error } = await supabase.rpc("create_food_order", {
      p_tenant_id: tenantId,
      p_branch_id: branchId,
      p_user_id: user.id,
      p_customer_name: user.email || "Guest",
      p_customer_phone: customerPhone,
      p_delivery_address: `Kiosk Order`,
      p_payment_method: "wallet",
      p_items: cart.map((c) => ({
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
      })),
      p_order_type: "dine_in",
      p_table_id: chosenTableId,
      p_num_guests: numGuests || 1,
    });
    if (error) {
      toast.error(`Failed to place order: ${error.message}`);
      setPlacing(false);
      return;
    }
    await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", data.order_id);
    setSelectedKioskTableId(chosenTableId);
    toast.success("Order placed!");
    setStep("success");
    setPlacing(false);
  };

  const handlePlaceOrder: any = async () => {
    if (!user || !tenantId || !effectiveTableId || cart.length === 0) return;
    setPlacing(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setPlacing(false);
      return;
    }

    const branchRes = await supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();
    const branchId = branchRes.data?.id;
    if (!branchId) {
      toast.error("Restaurant setup incomplete");
      setPlacing(false);
      return;
    }

    const { error } = await supabase.rpc("create_food_order", {
      p_tenant_id: tenantId,
      p_branch_id: branchId,
      p_user_id: user.id,
      p_customer_name: user.email || "Guest",
      p_customer_phone: customerPhone,
      p_delivery_address: `Dine-in - Table ${table?.table_number || ""}`,
      p_payment_method: paymentMethod,
      p_items: cart.map((c) => ({
        menu_item_id: c.menu_item_id,
        quantity: c.quantity,
      })),
      p_order_type: "dine_in",
      p_table_id: effectiveTableId,
      p_num_guests: numGuests,
    });

    if (error) {
      toast.error(`Failed to place order: ${error.message}`);
      setPlacing(false);
      return;
    }

    toast.success("Order placed!");
    setStep("success");
    setPlacing(false);
  };

  useEffect(() => {
    if (!isKioskMode || step !== "success") return;
    const timer = setTimeout(() => {
      setStep("idle");
      setCart([]);
      setSelectedKioskTableId(null);
      setKioskPaymentRequest(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isKioskMode, step]);

  if (!tenantId) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Invalid link. Please scan the QR code again.
      </div>
    );
  }

  if (isKioskMode && !selectedKioskTableId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center mb-6">
            <Utensils className="mx-auto h-12 w-12 text-primary mb-3" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Welcome!
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Please select your table to start ordering
            </p>
          </div>
          {kioskTables.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {kioskTables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedKioskTableId(t.id)}
                  className="aspect-square rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-1 hover:border-primary hover:shadow-md transition-all"
                >
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {t.table_number}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t.capacity} seats
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">
              No tables available.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showUpgradeModal) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Create Account to Pay
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Set an email &amp; password to use BahiBox Coin.
              </p>
            </div>
            <form onSubmit={handleUpgradeAccount} className="space-y-3">
              <Input
                required
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <Input
                required
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full h-11"
                disabled={authLoading}
              >
                {authLoading ? "Creating..." : "Create Account"}
              </Button>
            </form>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full text-center text-sm text-slate-500 dark:text-slate-400 font-semibold mt-4"
            >
              Cancel — pay with cash instead
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    const statusMeta: any = {
      pending_approval: {
        label: "Awaiting Approval",
        color: "text-amber-600",
        icon: Clock,
      },
      new: {
        label: "Order Confirmed",
        color: "text-blue-600",
        icon: CheckCircle2,
      },
      preparing: {
        label: "Preparing",
        color: "text-orange-600",
        icon: ChefHat,
      },
      ready: {
        label: "Ready to Serve",
        color: "text-emerald-600",
        icon: CheckCircle2,
      },
      served: { label: "Served", color: "text-slate-500", icon: CheckCircle2 },
      rejected: { label: "Rejected", color: "text-red-600", icon: X },
    };
    const lastOrder = myOrders[myOrders.length - 1];
    const lastKotStatus =
      lastOrder?.kitchen_order_tickets?.[0]?.status || "pending_approval";
    const meta = statusMeta[lastKotStatus] || statusMeta.pending_approval;
    const StatusIcon = meta.icon;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-sm mx-auto space-y-4 pt-8">
          <Card className="shadow-xl text-center">
            <CardContent className="p-8">
              <StatusIcon className={`mx-auto h-16 w-16 mb-4 ${meta.color}`} />
              {lastOrder?.token_number && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Token
                </p>
              )}
              {lastOrder?.token_number && (
                <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-3">
                  #{lastOrder.token_number}
                </p>
              )}
              <p className={`text-lg font-bold ${meta.color} mb-1`}>
                {meta.label}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Table {table?.table_number}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setShowOrderDetails(!showOrderDetails)}
            >
              View Order {showOrderDetails ? "▲" : "▼"}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setStep("menu");
                setCart([]);
              }}
            >
              Add More Items
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {showOrderDetails && (
                <div className="px-4 pb-4 space-y-4">
                  {myOrders.map((o, idx) => {
                    const kotStatus =
                      o.kitchen_order_tickets?.[0]?.status ||
                      "pending_approval";
                    const oMeta =
                      statusMeta[kotStatus] || statusMeta.pending_approval;
                    return (
                      <div
                        key={o.id}
                        className="border-t border-slate-100 dark:border-slate-800 pt-3 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-500">
                            Round {idx + 1}
                          </span>
                          <span className={`text-xs font-bold ${oMeta.color}`}>
                            {oMeta.label}
                          </span>
                        </div>
                        {o.order_items?.map((oi: any) => (
                          <div
                            key={oi.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-700 dark:text-slate-300">
                              {oi.restaurant_menu_items?.item_name} x
                              {oi.quantity}
                            </span>
                            <span className="text-slate-500">
                              ₹{oi.price * oi.quantity}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span
                            className={
                              o.payment_status === "paid"
                                ? "text-emerald-600 font-semibold"
                                : "text-amber-600 font-semibold"
                            }
                          >
                            {o.payment_status === "paid" ? "Paid" : "Unpaid"}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ₹{o.total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {unpaidTotal > 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Bill Total
                  </span>
                  <span className="font-extrabold text-lg text-primary">
                    ₹{unpaidTotal}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBillPaymentMethod("cod")}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${billPaymentMethod === "cod" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                  >
                    Pay at Table
                  </button>
                  <button
                    onClick={() => handleWalletClick(setBillPaymentMethod)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${billPaymentMethod === "wallet" ? "border-primary text-primary" : "border-slate-200 dark:border-slate-800 text-slate-500"}`}
                  >
                    BahiBox Coin
                  </button>
                </div>
                <Button
                  className="w-full h-11"
                  disabled={payingBill}
                  onClick={handlePayBill}
                >
                  {payingBill ? "Processing..." : `Pay Bill · ₹${unpaidTotal}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <KioskIdleScreen
        ads={kioskAds}
        businessName={businessName}
        onTap={() => setStep("menu")}
      />
    );
  }

  if (step === "payment" && kioskPaymentRequest) {
    return (
      <KioskPaymentScreen
        request={kioskPaymentRequest}
        businessName={businessName}
        onPaid={() => setStep("table_select")}
        onCancel={() => setStep("menu")}
      />
    );
  }

  if (step === "table_select") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center mb-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Payment Received!
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Please select your table
            </p>
          </div>
          {kioskTables.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {kioskTables.map((t) => (
                <button
                  key={t.id}
                  disabled={placing}
                  onClick={() => finalizeKioskOrder(t.id)}
                  className="aspect-square rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-1 hover:border-primary hover:shadow-md transition-all disabled:opacity-50"
                >
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {t.table_number}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t.capacity} seats
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">
              No tables available.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "guests") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="p-6 text-center">
            <Utensils className="mx-auto h-10 w-10 text-primary mb-2" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {businessName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Table {table?.table_number} · {table?.capacity} seats
            </p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              How many guests?
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setNumGuests(Math.max(1, numGuests - 1))}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-extrabold w-10 text-center">
                {numGuests}
              </span>
              <button
                onClick={() =>
                  setNumGuests(Math.min(table?.capacity || 99, numGuests + 1))
                }
                disabled={numGuests >= (table?.capacity || 99)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            {table?.capacity && numGuests >= table.capacity && (
              <p className="text-xs text-amber-600 mb-3">
                This table seats up to {table.capacity} guests.
              </p>
            )}
            <div className="mb-6 text-left">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                Your mobile number
              </label>
              <Input
                required
                type="tel"
                placeholder="10-digit mobile number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <Button
              className="w-full h-11"
              disabled={customerPhone.length < 10}
              onClick={() => setStep("menu")}
            >
              View Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {businessName}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Table {table?.table_number} · {numGuests} guest
          {numGuests > 1 ? "s" : ""}
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${!activeCategoryId ? "bg-primary text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          >
            All
          </button>
          {menuCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 ${activeCategoryId === cat.id ? "bg-primary text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find((c) => c.menu_item_id === item.id);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Utensils size={28} className="text-slate-300" />
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 border-2 rounded-sm ${item.is_veg ? "border-emerald-600" : "border-red-600"}`}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {item.item_name}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary mb-2">
                    ₹{item.price}
                  </p>
                  {inCart ? (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold">{inCart.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => addToCart(item)}
                    >
                      Add
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredMenuItems.length === 0 && (
            <p className="col-span-full text-center text-slate-400 py-8 text-sm">
              No menu items available right now.
            </p>
          )}
        </div>
      </div>

      {cart.length > 0 && isKioskMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
          <Button
            className="w-full h-12 gap-2"
            disabled={creatingPaymentRequest}
            onClick={handleKioskCheckout}
          >
            <ShoppingCart size={18} />{" "}
            {creatingPaymentRequest
              ? "Please wait..."
              : `Checkout · ₹${cartTotal}`}
          </Button>
        </div>
      )}
      {cart.length > 0 && !isKioskMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
          <Button
            className="w-full h-12 gap-2"
            onClick={() => setShowFoodPaymentSheet(true)}
          >
            <ShoppingCart size={18} /> {`Place Order · ₹${cartTotal}`}
          </Button>
        </div>
      )}
      <PaymentBottomSheet
        isOpen={showFoodPaymentSheet}
        onClose={() => setShowFoodPaymentSheet(false)}
        amount={cartTotal}
        tenantId={tenantId || ""}
        branchId={null}
        onCreateOrder={handleCreateFoodOrder as any}
        onPaymentConfirmed={handleFoodOrderConfirmed as any}
      />
    </div>
  );
};
