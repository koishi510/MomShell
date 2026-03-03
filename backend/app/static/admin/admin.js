/* MomShell Admin — Alpine.js application */

function adminApp() {
  return {
    // ── Auth ──
    token: localStorage.getItem("admin_token") || "",
    loginForm: { login: "", password: "" },
    loginError: "",

    // ── Navigation ──
    view: "dashboard",

    // ── Dashboard ──
    stats: null,

    // ── Users ──
    users: [],
    usersPag: { page: 1, page_size: 20, total: 0, total_pages: 0 },
    usersSearch: "",
    usersRoleFilter: "",
    usersStatusFilter: "",
    selectedUser: null,
    editForm: { role: "", is_active: true, is_banned: false },
    editError: "",

    // ── Config ──
    config: null,
    configForm: {},
    configSaved: false,
    configError: "",

    // ── Lifecycle ──
    async init() {
      if (this.token) {
        try {
          await this.loadDashboard();
        } catch {
          // Token expired or invalid
          this.token = "";
          localStorage.removeItem("admin_token");
        }
      }
    },

    // ── Auth ──
    async login() {
      this.loginError = "";
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.loginForm),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          this.loginError = err.detail || "Login failed";
          return;
        }
        const data = await res.json();
        this.token = data.access_token;
        localStorage.setItem("admin_token", this.token);

        // Verify admin role
        const me = await this.api("GET", "/auth/me");
        if (me.role !== "admin") {
          this.token = "";
          localStorage.removeItem("admin_token");
          this.loginError = "This account does not have admin privileges";
          return;
        }

        await this.loadDashboard();
      } catch (e) {
        this.loginError = e.message || "Login failed";
      }
    },

    logout() {
      this.token = "";
      localStorage.removeItem("admin_token");
      this.stats = null;
      this.users = [];
      this.config = null;
      this.view = "dashboard";
    },

    // ── API helper ──
    async api(method, path, body) {
      const opts = {
        method,
        headers: {
          Authorization: "Bearer " + this.token,
          "Content-Type": "application/json",
          "X-Access-Token": this.token,
        },
      };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch("/api/v1" + path, opts);
      if (res.status === 401 || res.status === 403) {
        this.logout();
        throw new Error("Session expired");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Request failed");
      }
      return res.json();
    },

    // ── View switching ──
    async switchView(v) {
      this.view = v;
      if (v === "dashboard") await this.loadDashboard();
      else if (v === "users") await this.loadUsers();
      else if (v === "config") await this.loadConfig();
    },

    // ── Dashboard ──
    async loadDashboard() {
      this.stats = await this.api("GET", "/admin/stats");
    },

    // ── Users ──
    async loadUsers() {
      const params = new URLSearchParams({
        page: this.usersPag.page,
        page_size: this.usersPag.page_size,
      });
      if (this.usersSearch) params.set("search", this.usersSearch);
      if (this.usersRoleFilter) params.set("role", this.usersRoleFilter);
      if (this.usersStatusFilter) params.set("status", this.usersStatusFilter);

      const data = await this.api("GET", "/admin/users?" + params.toString());
      this.users = data.items;
      this.usersPag.total = data.total;
      this.usersPag.total_pages = data.total_pages;
    },

    async selectUser(userId) {
      this.editError = "";
      this.selectedUser = await this.api("GET", "/admin/users/" + userId);
      this.editForm = {
        role: this.selectedUser.role,
        is_active: this.selectedUser.is_active,
        is_banned: this.selectedUser.is_banned,
      };
    },

    async saveUser() {
      this.editError = "";
      try {
        await this.api(
          "PATCH",
          "/admin/users/" + this.selectedUser.id,
          this.editForm,
        );
        this.selectedUser = null;
        await this.loadUsers();
      } catch (e) {
        this.editError = e.message;
      }
    },

    async confirmDeleteUser() {
      if (
        !confirm(
          "Are you sure you want to delete user @" +
            this.selectedUser.username +
            "? This cannot be undone.",
        )
      ) {
        return;
      }
      this.editError = "";
      try {
        await this.api("DELETE", "/admin/users/" + this.selectedUser.id);
        this.selectedUser = null;
        await this.loadUsers();
        if (this.view === "dashboard") await this.loadDashboard();
      } catch (e) {
        this.editError = e.message;
      }
    },

    // ── Config ──
    async loadConfig() {
      this.configSaved = false;
      this.configError = "";
      this.config = await this.api("GET", "/admin/config");
      // Copy editable fields
      this.configForm = {
        modelscope_key: this.config.modelscope_key,
        modelscope_base_url: this.config.modelscope_base_url,
        modelscope_model: this.config.modelscope_model,
        modelscope_image_model: this.config.modelscope_image_model,
        firecrawl_api_key: this.config.firecrawl_api_key,
        tts_voice: this.config.tts_voice,
        tts_rate: this.config.tts_rate,
        jwt_access_token_expire_minutes:
          this.config.jwt_access_token_expire_minutes,
        jwt_refresh_token_expire_days:
          this.config.jwt_refresh_token_expire_days,
        debug: this.config.debug,
      };
    },

    async saveConfig() {
      this.configSaved = false;
      this.configError = "";

      // Only send fields that changed and aren't masked
      const update = {};
      for (const [key, value] of Object.entries(this.configForm)) {
        if (value !== this.config[key] && !String(value).includes("****")) {
          update[key] = value;
        }
      }
      if (Object.keys(update).length === 0) {
        this.configError = "No changes detected";
        return;
      }

      try {
        this.config = await this.api("PATCH", "/admin/config", update);
        // Re-sync form with new config
        await this.loadConfig();
        this.configSaved = true;
        setTimeout(() => (this.configSaved = false), 3000);
      } catch (e) {
        this.configError = e.message;
      }
    },

    // ── Helpers ──
    fmtDate(iso) {
      if (!iso) return "-";
      const d = new Date(iso);
      return d.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  };
}
