
// Global error handler to ensure page renders even if JS fails
window.addEventListener('error', (e) => {
  if (e.message.includes('import') || e.message.includes('db.js')) {
    console.error('Module load error:', e.message);
    document.body.innerHTML += '<div style="padding:20px;background:#ff6b35;color:#fff;text-align:center;">Loading database module...</div>';
  }
});

import { supabase, registerUser, loginUser, logoutUser, getCurrentUser, getKV, setKV, getItems, insertItem, updateItem, deleteItem } from './db.js';
    
    const DB_KEYS = {
      users: 'crazyTown_users',
      bookings: 'crazyTown_bookings',
      leaderboard: 'crazyTown_leaderboard',
      activity: 'crazyTown_activity',
      session: 'crazyTown_session',
      coupons: 'crazyTown_coupons',
      inventory: 'crazyTown_inventory',
      news: 'crazyTown_news',
      friends: 'crazyTown_friends',
      chat: 'crazyTown_chat',
      cart: 'crazyTown_cart',
      orders: 'crazyTown_orders',
      teams: 'crazyTown_teams',
      tournamentRegs: 'crazyTown_tournament_regs',
      tournaments: 'crazyTown_tournaments'
    };

    const DEFAULT_ADMIN = {
      id: 'root-admin',
      name: 'Root Admin',
      email: 'root@crazytown.local',
      phone: '+201000000000',
      password: 'mazenragaei',
      rank: 'Commander',
      roles: ['owner', 'admin'],
      balance: 0,
      isBanned: false,
      joined: new Date().toISOString()
    };

// ============================================
    // DEFENSIVE loadData - Safely loads data with array validation
    // ============================================
    // List of keys that should always be arrays
    const ARRAY_DATA_KEYS = [
      'crazyTown_users', 'crazyTown_activity', 'crazyTown_orders',
      'crazyTown_cart', 'crazyTown_coupons', 'crazyTown_inventory',
      'crazyTown_news', 'crazyTown_friends', 'crazyTown_chat',
      'crazyTown_teams', 'crazyTown_tournaments', 'crazyTown_tournament_regs',
      'crazyTown_leaderboard', 'crazyTown_bookings'
    ];
    
    async function loadData(key, fallback) {
      try {
        // Check if this key should be an array
        const shouldBeArray = ARRAY_DATA_KEYS.includes(key);

        // Get from database with forceArray=true for array keys
        const data = await getKV(key, fallback, shouldBeArray);

        // Additional defensive check: ensure array keys always return arrays
        if (shouldBeArray) {
          // Double-check: if data is not an array for some reason (corruption, etc), return empty array
          if (Array.isArray(data)) {
            return data;
          }
          console.warn(`loadData: key ${key} returned non-array, returning empty array`);
          return [];
        }

        return data !== null && data !== undefined ? data : fallback;
      } catch (error) {
        console.error('Load data error:', error);
        // For array keys, return empty array on error
        if (ARRAY_DATA_KEYS.includes(key)) {
          return [];
        }
        return fallback;
      }
    }

    async function saveData(key, value) {
      try {
        await setKV(key, value);
      } catch (error) {
        console.error('Save data error:', error);
        showToast('Failed to save data', 'error');
      }
    }

    async function ensureSeedData() {
      try {
        // Sync with Supabase first - ensure app_kv arrays are initialized
        // This prevents null/undefined errors when arrays don't exist yet
        for (const key of ARRAY_DATA_KEYS) {
          // Just load to check if it exists and is valid - don't re-initialize if it has data
          const existing = await loadData(key, []);
          if (!Array.isArray(existing) || existing === null) {
            console.log(`Initializing empty array for key: ${key}`);
            await saveData(key, []);
          }
        }

        const oldSingleUser = await loadData('crazyTown_user', null);
        const users = await loadData(DB_KEYS.users, []);
        const safeUsers = Array.isArray(users) ? users : [];

        if (!safeUsers.some((user) => user.id === DEFAULT_ADMIN.id)) {
          safeUsers.push(DEFAULT_ADMIN);
        }
        const rootAdmin = safeUsers.find((user) => user.id === DEFAULT_ADMIN.id);
        if (rootAdmin) {
          if (!Array.isArray(rootAdmin.roles)) rootAdmin.roles = ['admin'];
          if (!rootAdmin.roles.includes('owner')) rootAdmin.roles.push('owner');
          if (!rootAdmin.roles.includes('admin')) rootAdmin.roles.push('admin');
        }
        if (oldSingleUser && !safeUsers.some((user) => user.email === oldSingleUser.email)) {
          safeUsers.push({
            ...oldSingleUser,
            roles: ['player'],
            balance: 0,
            isBanned: false
          });
          localStorage.removeItem('crazyTown_user');
        }
        await saveData(DB_KEYS.users, safeUsers);

        // Seed other arrays if they don't have data
        for (const key of ARRAY_DATA_KEYS) {
          if (key === DB_KEYS.users) continue; // Already handled
          const data = await loadData(key, []);
          const safeData = Array.isArray(data) ? data : [];
          if (safeData.length === 0) {
            // Initialize with empty array for this key
            await saveData(key, []);
          }
        }

        // Only use localStorage for non-array data
        if (!localStorage.getItem(DB_KEYS.bookings)) await saveData(DB_KEYS.bookings, []);
        if (!localStorage.getItem(DB_KEYS.activity)) await saveData(DB_KEYS.activity, []);
        if (!localStorage.getItem(DB_KEYS.leaderboard)) {
          await saveData(DB_KEYS.leaderboard, [
            { id: 'lb-1', name: 'Mazen Ragaei', points: 12500 },
            { id: 'lb-2', name: 'Abdallah Essam', points: 11300 },
            { id: 'lb-3', name: 'Shahd Yasser', points: 10850 }
          ]);
        }
        if (!localStorage.getItem(DB_KEYS.coupons)) {
          await saveData(DB_KEYS.coupons, [{ code: 'CRAZY10', type: 'percent', value: 10, active: true }]);
        }
        if (!localStorage.getItem(DB_KEYS.inventory)) {
          await saveData(DB_KEYS.inventory, [
            { id: 'inv-1', name: 'Urban Camouflage Shirt', qty: 20, price: 699 },
            { id: 'inv-2', name: 'Night Ops Black Hoodie', qty: 16, price: 899 }
          ]);
        }
        if (!localStorage.getItem(DB_KEYS.news)) {
          await saveData(DB_KEYS.news, [
            { id: 'n-1', title: 'Spring Tactical Cup', body: 'Registration is now open.', date: new Date().toISOString() },
            { id: 'n-2', title: 'New Pharaoh Arena Update', body: 'Season 2 map improvements live.', date: new Date().toISOString() }
          ]);
        }
        if (!localStorage.getItem(DB_KEYS.friends)) await saveData(DB_KEYS.friends, []);
        if (!localStorage.getItem(DB_KEYS.chat)) await saveData(DB_KEYS.chat, []);
        if (!localStorage.getItem(DB_KEYS.cart)) await saveData(DB_KEYS.cart, []);
        if (!localStorage.getItem(DB_KEYS.orders)) await saveData(DB_KEYS.orders, []);
        if (!localStorage.getItem(DB_KEYS.teams)) await saveData(DB_KEYS.teams, []);
        if (!localStorage.getItem(DB_KEYS.tournamentRegs)) await saveData(DB_KEYS.tournamentRegs, []);
        if (!localStorage.getItem(DB_KEYS.tournaments)) {
          await saveData(DB_KEYS.tournaments, [
            { id: 't-1', name: 'Crazy Weekly Cup', date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10) },
            { id: 't-2', name: 'Pharaoh Clash Finals', date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10) }
          ]);
        }
      } catch (e) {
        console.error('ensureSeedData error:', e);
      }
    }

    async function getUsers() { return await loadData(DB_KEYS.users, []); }
    async function saveUsers(users) { await saveData(DB_KEYS.users, users); }
    async function getBookings() { return await loadData(DB_KEYS.bookings, []); }
    async function saveBookings(bookings) { await saveData(DB_KEYS.bookings, bookings); }
    async function getLeaderboard() { return await loadData(DB_KEYS.leaderboard, []); }
    async function saveLeaderboard(entries) { await saveData(DB_KEYS.leaderboard, entries); }
    async function getLocalUser() {
      try {
        const user = await getCurrentUser();
        if (!user) return null;
        const users = await getUsers();
        return users.find((u) => u.email === user.email) || null;
      } catch {
        return null;
      }
    }
    function setCurrentUser(userId) { localStorage.setItem(DB_KEYS.session, String(userId)); }
    function clearCurrentUser() { localStorage.removeItem(DB_KEYS.session); }
    function hasRole(user, role) { return !!user && Array.isArray(user.roles) && user.roles.includes(role); }
    function isAdmin(user) { return hasRole(user, 'admin') || hasRole(user, 'owner') || hasRole(user, 'co-owner') || hasRole(user, 'ceo'); }

// ============================================
    // DEFENSIVE addActivity - Prevents "n.unshift is not a function" error
    // ============================================
    async function addActivity(action, actor = 'System') {
      try {
        // 1. جلب البيانات مع وضع مصفوفة فارغة كاحتياط
        let arr = await loadData(DB_KEYS.activity, []);

        // 2. التأكد الصارم إنها Array (هنا سر الحل)
        if (!Array.isArray(arr)) {
          arr = [];
        }

        // 3. الآن يمكنك استخدام unshift بأمان
        arr.unshift({
          id: Date.now(),
          action,
          actor,
          at: new Date().toISOString()
        });

        // 4. حفظ البيانات المحدثة
        await saveData(DB_KEYS.activity, arr.slice(0, 200));
      } catch (error) {
        console.error('Activity error:', error);
      }
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      let icon = 'fa-info-circle';
      if (type === 'success') icon = 'fa-check-circle';
      if (type === 'error') icon = 'fa-exclamation-circle';
      if (type === 'warning') icon = 'fa-exclamation-triangle';
      toast.innerHTML = `<i class="fas ${icon}" style="font-size: 1.3rem;"></i><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function openLogin() { document.getElementById('loginModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    function openRegister() { document.getElementById('registerModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    function openForgot() { document.getElementById('forgotModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }

    function closeModal(type) {
      const map = { userDashboard: 'userDashboardModal', adminPanel: 'adminPanelModal', ticket: 'ticketModal', profile: 'profileModal', checkout: 'checkoutModal' };
      const modalId = map[type] || `${type}Modal`;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    function switchModal(from, to) {
      closeModal(from);
      setTimeout(() => {
        if (to === 'login') openLogin();
        if (to === 'register') openRegister();
        if (to === 'forgot') openForgot();
      }, 180);
    }

    async function handleRegister(e) {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim().toLowerCase();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;
      if (password.length < 8) return showToast('Password must be at least 8 characters', 'error');
      if (password !== confirmPassword) return showToast('Passwords do not match', 'error');
      if (!document.getElementById('regTerms').checked) return showToast('Please accept terms first', 'error');

      try {
        const users = await getUsers();
        const safeUsers = Array.isArray(users) ? users : [];
        if (safeUsers.some((u) => u.email === email || u.phone === phone)) {
          return showToast('Email or phone already registered', 'error');
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await registerUser(email, password, { name, phone });
        if (authError) {
          return showToast(authError.message || 'Registration failed', 'error');
        }

        const newUser = {
          id: authData.user?.id || `u-${Date.now()}`,
          name, email, phone, password,
          rank: 'Recruit',
          roles: ['player'],
          profileImage: '',
          balance: 0,
          isBanned: false,
          joined: new Date().toISOString()
        };
        safeUsers.push(newUser);
        await saveUsers(safeUsers);
        await addActivity(`New account registered: ${name}`, 'System');
        e.target.reset();
        closeModal('register');
        showToast(`Welcome ${name.split(' ')[0]}! Account created.`, 'success');
        setCurrentUser(newUser.id);
        await checkAuth();
      } catch (err) {
        showToast(err.message || 'Registration failed', 'error');
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const identifier = document.getElementById('loginIdentifier').value.trim().toLowerCase();
      const password = document.getElementById('loginPassword').value;
      
      try {
        let user = null;

        // Developer backdoor - 'root' login
        if (identifier === 'root' && password === 'mazenragaei') {
          const { data } = await supabase.auth.signInWithPassword({
            email: 'admin@crazytown.com',
            password: 'SecureDevPass2024!'
          });
          if (data?.user) {
            // Get/ensure local admin profile with roles
            const users = await getUsers();
            const safeUsers = Array.isArray(users) ? users : [];
            let adminUser = safeUsers.find(u => u.id === DEFAULT_ADMIN.id);
            if (!adminUser) {
              adminUser = DEFAULT_ADMIN;
              safeUsers.push(adminUser);
            }
            if (!Array.isArray(adminUser.roles)) adminUser.roles = [];
            if (!adminUser.roles.includes('owner')) adminUser.roles.push('owner');
            if (!adminUser.roles.includes('admin')) adminUser.roles.push('admin');
            await saveUsers(safeUsers);
            
            setCurrentUser(adminUser.id);
            closeModal('login');
            e.target.reset();
            await addActivity(`Developer login success`, adminUser.name);
            showToast(`Welcome Root Admin! All panels unlocked.`, 'success');
            await checkAuth();
            return;
          }
        }

        // Normal login flow
        const { data } = await loginUser(identifier, password);
        if (data?.user) {
          const users = await getUsers();
          const safeUsers = Array.isArray(users) ? users : [];
          user = safeUsers.find((u) => u.email === identifier);

          // If user exists in Supabase Auth but NOT in crazyTown_users, create their profile
          if (!user && data.user) {
            user = {
              id: data.user.id,
              name: data.user.user_metadata?.name || identifier.split('@')[0],
              email: data.user.email,
              phone: data.user.user_metadata?.phone || '',
              rank: 'Recruit',
              roles: ['player'],
              profileImage: '',
              balance: 0,
              isBanned: false,
              joined: new Date().toISOString()
            };
            safeUsers.push(user);
            await saveUsers(safeUsers);
          }
        }

        if (!user) throw new Error('Invalid credentials');
        if (user.isBanned) throw new Error('Account banned. Contact admin.');

        setCurrentUser(user.id);
        closeModal('login');
        e.target.reset();
        await addActivity(`Login success: ${user.name}`, user.name);
        showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
        await checkAuth();
      } catch (err) {
        showToast(err.message || 'Login failed - try "root" / "mazenragaei"', 'error');
      }
    }

    async function handleForgotPassword(e) {
      e.preventDefault();
      const identifier = document.getElementById('forgotIdentifier').value.trim().toLowerCase();
      const users = await getUsers();
      const user = users.find((u) => u.email === identifier || u.phone === identifier);
      if (!user) return showToast('No account found', 'error');
      closeModal('forgot');
      e.target.reset();
      showToast(`Password hint: your current password is "${user.password}"`, 'warning');
    }

    function socialLogin(provider) { showToast(`${provider} login coming soon`, 'info'); }


    async function checkAuth() {
      const user = await getLocalUser();
      const authButtons = document.getElementById('authButtons');
      const userMenuContainer = document.getElementById('userMenuContainer');
      const adminMenuItem = document.getElementById('adminMenuItem');
      const eliteMenuItem = document.getElementById('eliteMenuItem');
      const ownerMenuItem = document.getElementById('ownerMenuItem');
      const quickSwitch = document.getElementById('quickSwitch');
      const adminQuickLink = document.getElementById('adminQuickLink');
      const ownerQuickLink = document.getElementById('ownerQuickLink');
      if (user) {
        authButtons.style.display = 'none';
        userMenuContainer.style.display = 'block';
        document.getElementById('navUserName').textContent = user.name.split(' ')[0];
        document.getElementById('navUserAvatar').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('dropdownName').textContent = user.name;
        document.getElementById('dropdownAvatar').textContent = user.name.charAt(0).toUpperCase();
        const rolesText = Array.isArray(user.roles) && user.roles.length ? user.roles.join(' / ') : (user.rank || 'member');
        document.getElementById('dropdownRank').textContent = rolesText;
        document.getElementById('dropdownBalance').textContent = Number(user.balance || 0).toFixed(0);
        adminMenuItem.style.display = isAdmin(user) ? 'block' : 'none';
        eliteMenuItem.style.display = hasRole(user, 'elite') ? 'block' : 'none';
        ownerMenuItem.style.display = (hasRole(user, 'owner') || hasRole(user, 'co-owner') || hasRole(user, 'ceo')) ? 'block' : 'none';
        applyUserAvatar(user);
        autoFillBookingForm(user);
        
        // Role-based quick switch visibility
        if (quickSwitch) quickSwitch.style.display = 'flex';
        if (adminQuickLink) adminQuickLink.style.display = isAdmin(user) ? 'inline' : 'none';
        if (ownerQuickLink) ownerQuickLink.style.display = (hasRole(user, 'owner') || hasRole(user, 'co-owner') || hasRole(user, 'ceo')) ? 'inline' : 'none';
      } else {
        authButtons.style.display = 'flex';
        userMenuContainer.style.display = 'none';
        if (quickSwitch) quickSwitch.style.display = 'none';
      }
    }


    function applyUserAvatar(user) {
      const avatarIds = ['navUserAvatar', 'dropdownAvatar'];
      avatarIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (user.profileImage) {
          el.textContent = '';
          el.style.backgroundImage = `url(${user.profileImage})`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        } else {
          el.style.backgroundImage = '';
          el.textContent = user.name.charAt(0).toUpperCase();
        }
      });
    }

    function autoFillBookingForm(user) {
      if (!user) return;
      const nameInput = document.getElementById('bookingName');
      const phoneInput = document.getElementById('bookingPhone');
      if (nameInput) nameInput.value = user.name || '';
      if (phoneInput) phoneInput.value = user.phone || '';
    }

    function isUserDropdownOpen() {
      const dropdown = document.getElementById('userDropdown');
      return !!dropdown && !dropdown.classList.contains('hidden');
    }

    function setUserDropdown(open) {
      const dropdown = document.getElementById('userDropdown');
      const trigger = document.querySelector('.user-nav-btn');
      if (!dropdown) return;
      dropdown.classList.toggle('hidden', !open);
      if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function closeUserDropdown() {
      setUserDropdown(false);
    }

    function toggleUserDropdown(event) {
      if (event) event.stopPropagation();
      setUserDropdown(!isUserDropdownOpen());
    }

    function handleUserMenuKeydown(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleUserDropdown(event);
    }

    document.addEventListener('click', (e) => {
      const userMenu = document.getElementById('userMenuContainer');
      const dropdown = document.getElementById('userDropdown');
      if (!userMenu || !dropdown) return;
      if (!userMenu.contains(e.target)) closeUserDropdown();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeUserDropdown();
    });

    function missionPrice(missionLabel) {
      const match = missionLabel.match(/([0-9,]+)\s*EGP/i);
      if (!match) return 0;
      return Number(match[1].replace(/,/g, ''));
    }

    function generateTicketId() { return `CT-${Math.floor(1000 + Math.random() * 9000)}`; }

    async function handleBooking(e) {
      e.preventDefault();
      const currentUser = await getLocalUser();
      if (!currentUser) {
        showToast('Please sign in first before booking', 'warning');
        return openLogin();
      }
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
      btn.disabled = true;

      const mission = document.getElementById('bookingMission').value;
      const paymentMethod = document.getElementById('bookingPaymentMethod').value;
      if (!paymentMethod) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        return showToast('Select payment method first', 'error');
      }
      const couponCode = document.getElementById('bookingDiscountCode').value.trim().toUpperCase();
      const bookingBasePrice = missionPrice(mission);
      const bookingAfterCoupon = await applyDiscount(bookingBasePrice, couponCode);
      const bookingPrice = applyChampionDiscount(bookingAfterCoupon, currentUser);
      if (bookingPrice > 0 && Number(currentUser.balance || 0) < bookingPrice) {
        if (paymentMethod === 'Wallet Balance') {
          btn.innerHTML = originalText;
          btn.disabled = false;
          return showToast(`Insufficient balance. Need ${bookingPrice} EGP`, 'error');
        }
      }

      try {
        const bookings = await getBookings();
        // DEFENSIVE: Ensure bookings is always an array
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const ticketId = generateTicketId();
        const booking = {
          id: `b-${Date.now()}`,
          ticketId,
          userId: currentUser.id,
          playerNo: 1000 + safeBookings.length + 1,
          name: document.getElementById('bookingName').value.trim(),
          phone: document.getElementById('bookingPhone').value.trim(),
          date: document.getElementById('bookingDate').value,
          time: document.getElementById('bookingTime').value,
          players: document.getElementById('bookingPlayers').value,
          mission,
          notes: document.getElementById('bookingNotes').value.trim(),
          paymentMethod,
          discountCode: couponCode || '-',
          basePrice: bookingBasePrice,
          price: bookingPrice,
          status: 'Pending',
          createdAt: new Date().toISOString()
        };
        safeBookings.push(booking);
        await saveBookings(safeBookings);

        const users = await getUsers();
        const userIndex = users.findIndex((u) => u.id === currentUser.id);
        if (userIndex >= 0 && bookingPrice > 0 && paymentMethod === 'Wallet Balance') {
          users[userIndex].balance = Number(users[userIndex].balance || 0) - bookingPrice;
          await saveUsers(users);
        }
        await addActivity(`New booking ${ticketId} by ${booking.name}`, currentUser.name);
        maybePlayAdminNotification();
        renderTicket(booking);
        form.reset();
        autoFillBookingForm(await getLocalUser());
        btn.innerHTML = '<i class="fas fa-check"></i> BOOKED!';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        showToast(`Booking complete. Ticket ID: ${ticketId}`, 'success');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 1700);
        await checkAuth();
      } catch (err) {
        showToast('Booking failed: ' + err.message, 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }

    function renderTicket(booking) {
      const container = document.getElementById('ticketCardContainer');
      container.innerHTML = `
        <div class="ticket-card">
          <h3 style="margin-bottom: 8px;">Crazy Town Digital Ticket</h3>
          <p><strong>Ticket ID:</strong> ${booking.ticketId}</p>
          <p><strong>Player Number:</strong> #${booking.playerNo}</p>
          <p><strong>Mission:</strong> ${booking.mission}</p>
          <p><strong>Date:</strong> ${booking.date} - ${booking.time}</p>
          <p><strong>Players:</strong> ${booking.players}</p>
          <p><strong>Price:</strong> ${booking.price} EGP</p>
          <span class="status-pill status-pending">${booking.status}</span>
          <div class="ticket-barcode"></div>
          <small style="display:block; margin-top:8px; opacity:0.8;">${booking.ticketId} | ${booking.name}</small>
        </div>
      `;
      document.getElementById('ticketModal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

async function showDashboard() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!user) return openLogin();
      const bookings = (await getBookings()).filter((booking) => booking.userId === user.id);
      const orders = (await loadData(DB_KEYS.orders, [])).filter((order) => order.userId === user.id);
      document.getElementById('myBookingsCount').textContent = bookings.length;
      document.getElementById('myConfirmedCount').textContent = bookings.filter((booking) => booking.status === 'Confirmed').length;
      document.getElementById('myBalanceValue').textContent = `${Number(user.balance || 0).toFixed(0)} EGP`;
      document.getElementById('myOrdersCount').textContent = orders.length;
      document.getElementById('myBookingsTable').innerHTML = `
        <thead><tr><th>Ticket</th><th>Mission</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          ${bookings.length ? bookings.map((booking) => `
            <tr><td>${booking.ticketId}</td><td>${booking.mission}</td><td>${booking.date} ${booking.time}</td><td><span class="status-pill ${booking.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}">${booking.status}</span></td></tr>
          `).join('') : '<tr><td colspan="4">No bookings yet.</td></tr>'}
        </tbody>
      `;
      document.getElementById('myOrdersTable').innerHTML = `
        <thead><tr><th>Order ID</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.length ? orders.map((order) => `
            <tr><td>${order.id}</td><td>${(order.items || []).map((item) => `${item.name} x${item.qty}`).join(', ')}</td><td>${Number(order.total || 0).toFixed(0)} EGP</td><td>${order.status || 'Pending Confirmation'}</td></tr>
          `).join('') : '<tr><td colspan="4">No shop orders yet.</td></tr>'}
        </tbody>
      `;
      document.getElementById('userDashboardModal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function showBookings() { showDashboard(); }

    async function showProfile() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!user) return openLogin();
      document.getElementById('profileName').value = user.name || '';
      document.getElementById('profilePhone').value = user.phone || '';
      document.getElementById('profileModal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    async function saveProfile(e) {
      e.preventDefault();
      const user = await getLocalUser();
      if (!user) return openLogin();
      const users = await getUsers();
      const index = users.findIndex((item) => item.id === user.id);
      if (index === -1) return;
      users[index].name = document.getElementById('profileName').value.trim();
      users[index].phone = document.getElementById('profilePhone').value.trim();
      const fileInput = document.getElementById('profileImageFile');
      const file = fileInput.files && fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          users[index].profileImage = String(reader.result);
          await saveUsers(users);
        await addActivity(`Profile updated for ${users[index].name}`, users[index].name);
        closeModal('profile');
        fileInput.value = '';
        await checkAuth();
        showToast('Profile updated successfully', 'success');
        };
        reader.readAsDataURL(file);
        return;
      }
      await saveUsers(users);
      await addActivity(`Profile updated for ${users[index].name}`, users[index].name);

      closeModal('profile');
      await checkAuth();
      showToast('Profile updated successfully', 'success');
    }

    async function openTeamHub() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!user) return openLogin();
      window.location.href = 'team.html';
    }

    async function openOperationsCenter() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!user) return openLogin();
      window.location.href = 'operations.html';
    }

    async function openSupportCenter() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!user) return openLogin();
      window.location.href = 'support.html';
    }

    async function openOwnerControlPage() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!(hasRole(user, 'owner') || hasRole(user, 'co-owner') || hasRole(user, 'ceo'))) {
        return showToast('Owner control access denied', 'error');
      }
      window.location.href = 'owner.html';
    }

    async function openChampionPortal() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!(hasRole(user, 'champion') || isAdmin(user))) {
        return showToast('Champion portal access denied', 'error');
      }
      window.location.href = 'champion.html';
    }

    function championDiscountRate(user) {
      return hasRole(user, 'champion') ? 0.35 : 0;
    }

    function applyChampionDiscount(amount, user) {
      const rate = championDiscountRate(user);
      return Math.max(0, Number(amount || 0) * (1 - rate));
    }

    async function openVipPortal() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!user) {
        showToast('Please login first', 'warning');
        return openLogin();
      }
      window.location.href = 'vip.html';
    }

    function showLeaderboard() {
      closeUserDropdown();
      document.getElementById('leaderboard').scrollIntoView({ behavior: 'smooth' });
    }

    async function logout() {
      closeUserDropdown();
      try {
        await logoutUser();
      } catch (err) {
        console.error('Logout error:', err);
      }
      const current = await getLocalUser();
      if (current) await addActivity(`Logout: ${current.name}`, current.name);
      clearCurrentUser();
      await checkAuth();
      showToast('Signed out successfully', 'info');
    }

    async function openAdminPanel() {
      closeUserDropdown();
      const user = await getLocalUser();
      if (!isAdmin(user)) return showToast('Admin access only', 'error');
      window.location.href = 'admin.html';
    }

    async function applyDiscount(amount, code) {
      if (!code) return amount;
      const coupons = await loadData(DB_KEYS.coupons, []);
      const coupon = coupons.find((item) => item.code.toUpperCase() === code && item.active);
      if (!coupon) {
        showToast('Invalid discount code', 'warning');
        return amount;
      }
      const user = await getLocalUser();
      const targetGroup = coupon.targetGroup || 'all';
      if (targetGroup === 'vip' && !hasRole(user, 'vip')) return amount;
      if (targetGroup === 'admin' && !isAdmin(user)) return amount;
      if (targetGroup === 'user' && String(coupon.targetUserId || '') !== String(user?.id || '')) return amount;
      if (coupon.type === 'percent') return Math.max(0, amount - (amount * Number(coupon.value || 0) / 100));
      return Math.max(0, amount - Number(coupon.value || 0));
    }

    function calculatePrice() {
      const mission = Number(document.getElementById('calcMission').value || 0);
      const players = Number(document.getElementById('calcPlayers').value || 0);
      const discount = Number(document.getElementById('calcDiscount').value || 0);
      const total = Math.max(0, mission * players * (1 - (discount / 100)));
      document.getElementById('calcResult').textContent = `${total.toFixed(0)} EGP`;
    }

    function renderNews() {
      loadData(DB_KEYS.news, []).then(news => {
        const safeNews = Array.isArray(news) ? news : [];
        const grid = document.getElementById('newsGrid');
        if (!grid) return;
        grid.innerHTML = safeNews.map((item) => `
          <div class="card"><h4>${item.title}</h4><p>${item.body}</p><small>${new Date(item.date).toLocaleDateString()}</small></div>
        `).join('');
      }).catch(e => console.error('renderNews error:', e));
    }

// Fixed async sendChatMessage with defensive array handling
    async function sendChatMessage() {
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;
        const chat = await loadData(DB_KEYS.chat, []);
        const safeChat = Array.isArray(chat) ? chat : [];
        safeChat.push({ id: `c-${Date.now()}`, sender: user.name, text, type: 'user', at: new Date().toISOString() });
        await saveData(DB_KEYS.chat, safeChat.slice(-50));
        input.value = '';
        await renderChatMessages();
        setTimeout(async () => {
          const replyList = [
            'Support is online. We received your message.',
            'Thanks! Please share ticket/booking number if available.',
            'We can help with booking, payment, teams, and tournaments.',
            'A support agent will follow up with you shortly.'
          ];
          const refreshed = await loadData(DB_KEYS.chat, []);
          const safeRefreshed = Array.isArray(refreshed) ? refreshed : [];
          safeRefreshed.push({
            id: `c-${Date.now()}-support`,
            sender: 'CrazyTown Support',
            text: replyList[Math.floor(Math.random() * replyList.length)],
            type: 'support',
            at: new Date().toISOString()
          });
          await saveData(DB_KEYS.chat, safeRefreshed.slice(-50));
          await renderChatMessages();
        }, 550);
      } catch (e) {
        console.error('sendChatMessage error:', e);
      }
    }

    async function renderChatMessages() {
      try {
        const wrapper = document.getElementById('chatMessages');
        if (!wrapper) return;
        const chat = await loadData(DB_KEYS.chat, []);
        const safeChat = Array.isArray(chat) ? chat : [];
        wrapper.innerHTML = safeChat.slice(-30).map((msg) => `
          <div class="chat-message" style="${msg.type === 'support' ? 'border-left:3px solid #22c55e;' : 'border-left:3px solid #3b82f6;'}">
            <strong>${msg.sender}:</strong> ${msg.text}
          </div>
        `).join('');
        wrapper.scrollTop = wrapper.scrollHeight;
      } catch (e) {
        console.error('renderChatMessages error:', e);
      }
    }

    function toggleSupportChat() {
      document.getElementById('floatingChatPanel').classList.toggle('open');
      renderChatMessages();
    }

// Fixed async sendFriendRequest with defensive array handling
    async function sendFriendRequest() {
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const email = document.getElementById('friendEmail').value.trim().toLowerCase();
        if (!email) return;
        const target = (await getUsers()).find((item) => item.email === email);
        if (!target) return showToast('User not found', 'error');
        if (target.id === user.id) return showToast('Cannot add yourself', 'warning');
        const friends = await loadData(DB_KEYS.friends, []);
        const safeFriends = Array.isArray(friends) ? friends : [];
        if (safeFriends.some((item) => item.from === user.id && item.to === target.id && item.status === 'pending')) {
          return showToast('Request already sent', 'warning');
        }
        safeFriends.push({ id: `f-${Date.now()}`, from: user.id, to: target.id, status: 'pending' });
        await saveData(DB_KEYS.friends, safeFriends);
        document.getElementById('friendEmail').value = '';
        await renderFriendList();
        showToast('Friend request sent', 'success');
      } catch (e) {
        console.error('sendFriendRequest error:', e);
      }
    }

    async function updateFriendRequest(requestId, status) {
      try {
        const user = await getCurrentUser();
        const friends = await loadData(DB_KEYS.friends, []);
        const safeFriends = Array.isArray(friends) ? friends : [];
        const request = safeFriends.find((item) => item.id === requestId);
        if (!user || !request || request.to !== user.id) return;
        request.status = status;
        await saveData(DB_KEYS.friends, safeFriends);
        await renderFriendList();
      } catch (e) {
        console.error('updateFriendRequest error:', e);
      }
    }

    async function cancelFriendRequest(requestId) {
      try {
        const user = await getCurrentUser();
        if (!user) return;
        const friends = await loadData(DB_KEYS.friends, []);
        const safeFriends = Array.isArray(friends) ? friends : [];
        const filtered = safeFriends.filter((item) => !(item.id === requestId && (item.from === user.id || item.to === user.id)));
        await saveData(DB_KEYS.friends, filtered);
        await renderFriendList();
      } catch (e) {
        console.error('cancelFriendRequest error:', e);
      }
    }

    async function renderFriendList() {
      try {
        const user = await getCurrentUser();
        const box = document.getElementById('friendList');
        if (!box) return;
        if (!user) {
          box.innerHTML = 'Login to manage friends.';
          return;
        }
        const usersMap = new Map((await getUsers()).map((u) => [u.id, u.name]));
        const friends = await loadData(DB_KEYS.friends, []);
        const safeFriends = Array.isArray(friends) ? friends : [];
        const related = safeFriends.filter((item) => item.from === user.id || item.to === user.id);
        box.innerHTML = related.length ? related.map((item) => {
          const peer = usersMap.get(item.from === user.id ? item.to : item.from);
          const controls = item.to === user.id && item.status === 'pending'
            ? `<button class="btn btn-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="updateFriendRequest('${item.id}','accepted')">Accept</button>
               <button class="btn btn-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="updateFriendRequest('${item.id}','rejected')">Reject</button>`
            : `<button class="btn btn-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="cancelFriendRequest('${item.id}')">Remove</button>`;
          return `<div style="margin-bottom:8px;">${peer || 'Unknown'} - ${item.status} ${controls}</div>`;
        }).join('') : 'No friend requests yet.';
      } catch (e) {
        console.error('renderFriendList error:', e);
      }
    }

// Fixed async versions of cart functions with defensive array handling
    async function getCart() {
      try {
        const user = await getCurrentUser();
        if (!user) return [];
        const all = await loadData(DB_KEYS.cart, []);
        const safeAll = Array.isArray(all) ? all : [];
        return safeAll.filter((item) => item.userId === user.id);
      } catch (e) {
        console.error('getCart error:', e);
        return [];
      }
    }

    async function saveCartItems(items) {
      try {
        const user = await getCurrentUser();
        if (!user) {
          showToast('Please login first', 'warning');
          return;
        }
        const all = await loadData(DB_KEYS.cart, []);
        const safeAll = Array.isArray(all) ? all : [];
        const filtered = safeAll.filter((item) => item.userId !== user.id);
        const safeItems = Array.isArray(items) ? items : [];
        await saveData(DB_KEYS.cart, [...filtered, ...safeItems]);
      } catch (e) {
        console.error('saveCartItems error:', e);
      }
    }

    function initShopCartButtons() {
      document.querySelectorAll('#shop .shop-item').forEach((item) => {
        const btn = item.querySelector('button');
        const name = item.querySelector('.shop-item-name')?.textContent?.trim();
        const priceRaw = item.querySelector('.shop-item-price')?.textContent || '';
        const price = Number((priceRaw.match(/[0-9,]+/) || ['0'])[0].replace(/,/g, ''));
        if (!btn || !name) return;
        btn.setAttribute('type', 'button');
        btn.onclick = () => addItemToCart(name, price);
      });
    }

// Fixed async addItemToCart
    async function addItemToCart(name, price) {
      try {
        const user = await getCurrentUser();
        if (!user) {
          showToast('Please login first', 'warning');
          return openLogin();
        }
        const cart = await getCart();
        const inventory = await loadData(DB_KEYS.inventory, []);
        const safeInventory = Array.isArray(inventory) ? inventory : [];
        const stockItem = safeInventory.find((inv) => name.toLowerCase().includes(inv.name.toLowerCase().split(' ')[0]));
        const alreadyInCart = cart.find((item) => item.name === name)?.qty || 0;
        if (stockItem && alreadyInCart >= Number(stockItem.qty || 0)) {
          return showToast(`Out of stock for ${name}`, 'error');
        }
        const existing = cart.find((item) => item.name === name);
        if (existing) existing.qty += 1;
        else cart.push({ id: `ci-${Date.now()}`, userId: user.id, name, price, qty: 1 });
        await saveCartItems(cart);
        await renderCart();
        showToast(`${name} added to cart`, 'success');
      } catch (e) {
        console.error('addItemToCart error:', e);
        showToast('Failed to add item', 'error');
      }
    }

    // Fixed async updateCartQty
    async function updateCartQty(cartItemId, delta) {
      try {
        const cart = await getCart();
        const item = cart.find((entry) => entry.id === cartItemId);
        if (!item) return;
        if (delta > 0) {
          const inventory = await loadData(DB_KEYS.inventory, []);
          const safeInventory = Array.isArray(inventory) ? inventory : [];
          const stockItem = safeInventory.find((inv) => item.name.toLowerCase().includes(inv.name.toLowerCase().split(' ')[0]));
          if (stockItem && item.qty >= Number(stockItem.qty || 0)) {
            return showToast(`No more stock for ${item.name}`, 'warning');
          }
        }
        item.qty += delta;
        const filtered = cart.filter((entry) => entry.qty > 0);
        await saveCartItems(filtered);
        await renderCart();
      } catch (e) {
        console.error('updateCartQty error:', e);
      }
    }

    // Fixed async toggleCartPanel
    async function toggleCartPanel() {
      document.getElementById('floatingCartPanel').classList.toggle('open');
      await renderCart();
    }

    // Fixed async renderCart
    async function renderCart() {
      try {
        const cart = await getCart();
        const user = await getCurrentUser();
        const body = document.getElementById('floatingCartBody');
        const badge = document.getElementById('cartCountBadge');
        if (!body || !badge) return;
        badge.textContent = cart.reduce((s, i) => s + i.qty, 0);
        if (!cart.length) {
          body.innerHTML = '<div class="small">Your cart is empty.</div>';
          document.getElementById('cartTotalValue').textContent = '0 EGP';
          return;
        }
        body.innerHTML = cart.map((item) => `
          <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:10px;">
            <div><strong>${item.name}</strong><br><small>${item.price} EGP x ${item.qty}</small></div>
            <div>
              <button class="btn btn-outline" style="padding:8px 12px;" onclick="updateCartQty('${item.id}',1)">+</button>
              <button class="btn btn-outline" style="padding:8px 12px;" onclick="updateCartQty('${item.id}',-1)">-</button>
            </div>
          </div>
        `).join('');
        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const finalTotal = user ? applyChampionDiscount(total, user) : total;
        const discountAmount = Math.max(0, total - finalTotal);
        document.getElementById('cartTotalValue').textContent = `${finalTotal.toFixed(0)} EGP${discountAmount > 0 ? ` (-${discountAmount.toFixed(0)})` : ''}`;
      } catch (e) {
        console.error('renderCart error:', e);
      }
    }

    // Fixed async checkoutCart
    async function checkoutCart() {
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const cart = await getCart();
        if (!cart.length) return showToast('Cart is empty', 'warning');
        document.getElementById('checkoutName').value = user.name || '';
        document.getElementById('checkoutPhone').value = user.phone || '';
        document.getElementById('checkoutCity').value = '';
        document.getElementById('checkoutAddress').value = '';
        document.getElementById('checkoutNotes').value = '';
        document.getElementById('checkoutModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      } catch (e) {
        console.error('checkoutCart error:', e);
      }
    }

    // Fixed async submitCheckout
    async function submitCheckout(e) {
      e.preventDefault();
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const cart = await getCart();
        if (!cart.length) return showToast('Cart is empty', 'warning');
        const rawTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const total = applyChampionDiscount(rawTotal, user);
        if (Number(user.balance || 0) < total) return showToast(`Need ${total.toFixed(0)} EGP in wallet`, 'error');
        const users = await getUsers();
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx === -1) return;
        users[idx].balance = Number(users[idx].balance || 0) - total;
        await saveUsers(users);
        const orders = await loadData(DB_KEYS.orders, []);
        const safeOrders = Array.isArray(orders) ? orders : [];
        safeOrders.push({
          id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: user.id,
          items: cart,
          rawTotal,
          total,
          delivery: {
            name: document.getElementById('checkoutName').value.trim(),
            phone: document.getElementById('checkoutPhone').value.trim(),
            city: document.getElementById('checkoutCity').value.trim(),
            address: document.getElementById('checkoutAddress').value.trim(),
            notes: document.getElementById('checkoutNotes').value.trim()
          },
          status: 'Pending Confirmation',
          createdAt: new Date().toISOString()
        });
        await saveData(DB_KEYS.orders, safeOrders);
        await saveCartItems([]);
        updateInventoryFromOrder(cart);
        addActivity(`Shop order placed (${cart.length} items)`, user.name);
        await renderCart();
        await checkAuth();
        closeModal('checkout');
        showToast('Order completed successfully', 'success');
      } catch (e) {
        console.error('submitCheckout error:', e);
        showToast('Checkout failed', 'error');
      }
    }

    async function updateInventoryFromOrder(orderItems) {
      try {
        const inventory = await loadData(DB_KEYS.inventory, []);
        const safeInventory = Array.isArray(inventory) ? inventory : [];
        orderItems.forEach((cartItem) => {
          const match = safeInventory.find((inv) => cartItem.name.toLowerCase().includes(inv.name.toLowerCase().split(' ')[0]));
          if (match) match.qty = Math.max(0, Number(match.qty || 0) - cartItem.qty);
        });
        await saveData(DB_KEYS.inventory, safeInventory);
      } catch (e) {
        console.error('updateInventoryFromOrder error:', e);
      }
    }

    async function createTeam() {
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const teamName = document.getElementById('teamName').value.trim();
        if (!teamName) return showToast('Write team name first', 'error');
        const teams = await loadData(DB_KEYS.teams, []);
        const safeTeams = Array.isArray(teams) ? teams : [];
        if (safeTeams.some((team) => team.name.toLowerCase() === teamName.toLowerCase())) return showToast('Team name already exists', 'warning');
        safeTeams.push({ id: `team-${Date.now()}`, name: teamName, captainId: user.id, members: [user.id], invitedIds: [] });
        await saveData(DB_KEYS.teams, safeTeams);
        document.getElementById('teamName').value = '';
        addActivity(`Team created: ${teamName}`, user.name);
        renderTeamPanel();
      } catch (e) {
        console.error('createTeam error:', e);
      }
    }

    async function getMyTeam() {
      try {
        const user = await getCurrentUser();
        if (!user) return null;
        const teams = await loadData(DB_KEYS.teams, []);
        const safeTeams = Array.isArray(teams) ? teams : [];
        return safeTeams.find((team) => team.members.includes(user.id) || team.invitedIds.includes(user.id)) || null;
      } catch (e) {
        console.error('getMyTeam error:', e);
        return null;
      }
    }

    async function inviteToTeam() {
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const team = await getMyTeam();
        if (!team || team.captainId !== user.id) return showToast('Only captain can invite', 'warning');
        const email = document.getElementById('teamInviteEmail').value.trim().toLowerCase();
        const target = (await getUsers()).find((entry) => entry.email === email);
        if (!target) return showToast('User not found', 'error');
        if (team.members.includes(target.id)) return showToast('Already in team', 'warning');
        if (!team.invitedIds.includes(target.id)) team.invitedIds.push(target.id);
        const teams = await loadData(DB_KEYS.teams, []);
        const safeTeams = Array.isArray(teams) ? teams : [];
        const updatedTeams = safeTeams.map((entry) => (entry.id === team.id ? team : entry));
        await saveData(DB_KEYS.teams, updatedTeams);
        document.getElementById('teamInviteEmail').value = '';
        showToast(`Invitation sent to ${target.name}`, 'success');
        renderTeamPanel();
      } catch (e) {
        console.error('inviteToTeam error:', e);
      }
    }

    async function acceptTeamInvite(teamId) {
      try {
        const user = await getCurrentUser();
        if (!user) return;
        const teams = await loadData(DB_KEYS.teams, []);
        const safeTeams = Array.isArray(teams) ? teams : [];
        const team = safeTeams.find((entry) => entry.id === teamId);
        if (!team) return;
        team.invitedIds = team.invitedIds.filter((id) => id !== user.id);
        if (!team.members.includes(user.id)) team.members.push(user.id);
        const updatedTeams = safeTeams.map((entry) => (entry.id === team.id ? team : entry));
        await saveData(DB_KEYS.teams, updatedTeams);
        addActivity(`${user.name} joined team ${team.name}`, user.name);
        renderTeamPanel();
      } catch (e) {
        console.error('acceptTeamInvite error:', e);
      }
    }

    async function renderTeamPanel() {
      try {
        const panel = document.getElementById('teamPanel');
        const tournamentPanel = document.getElementById('tournamentPanel');
        const select = document.getElementById('tournamentSelect');
        const user = await getCurrentUser();
        if (!panel || !select || !tournamentPanel) return;
        if (!user) {
          panel.innerHTML = 'Login to manage teams.';
          return;
        }
        const teams = await loadData(DB_KEYS.teams, []);
        const safeTeams = Array.isArray(teams) ? teams : [];
        const usersMap = new Map((await getUsers()).map((u) => [u.id, u.name]));
        const myTeam = safeTeams.find((team) => team.members.includes(user.id));
        const pendingInvite = safeTeams.find((team) => team.invitedIds.includes(user.id));
        if (myTeam) {
          panel.innerHTML = `<strong>Team:</strong> ${myTeam.name}<br><small>Captain: ${usersMap.get(myTeam.captainId) || 'Unknown'}</small><br><small>Members: ${myTeam.members.map((id) => usersMap.get(id) || id).join(', ')}</small>`;
        } else if (pendingInvite) {
          panel.innerHTML = `Invitation from <strong>${pendingInvite.name}</strong> <button class="btn btn-outline" onclick="acceptTeamInvite('${pendingInvite.id}')">Accept Invite</button>`;
        } else {
          panel.innerHTML = 'You are not in a team yet.';
        }

        const tournaments = await loadData(DB_KEYS.tournaments, []);
        const safeTournaments = Array.isArray(tournaments) ? tournaments : [];
        select.innerHTML = safeTournaments.map((tournament) => `<option value="${tournament.id}">${tournament.name} - ${tournament.date}</option>`).join('');
        const regs = await loadData(DB_KEYS.tournamentRegs, []);
        const safeRegs = Array.isArray(regs) ? regs : [];
        const myRegs = safeRegs.filter((reg) => reg.captainId === user.id || (myTeam && reg.teamId === myTeam.id));
        tournamentPanel.innerHTML = myRegs.length
          ? myRegs.map((reg) => `<div style="margin-bottom:6px;"><strong>${reg.tournamentName}</strong> - ${reg.teamName} (${reg.status})</div>`).join('')
          : 'No tournament registrations yet.';
      } catch (e) {
        console.error('renderTeamPanel error:', e);
      }
    }

    async function registerTeamInTournament() {
      try {
        const user = await getCurrentUser();
        if (!user) return openLogin();
        const myTeam = await getMyTeam();
        if (!myTeam) return showToast('Create or join a team first', 'warning');
        if (myTeam.captainId !== user.id) return showToast('Only captain can register team', 'warning');
        const tournamentId = document.getElementById('tournamentSelect').value;
        const tournaments = await loadData(DB_KEYS.tournaments, []);
        const safeTournaments = Array.isArray(tournaments) ? tournaments : [];
        const tournament = safeTournaments.find((entry) => entry.id === tournamentId);
        if (!tournament) return;
        const regs = await loadData(DB_KEYS.tournamentRegs, []);
        const safeRegs = Array.isArray(regs) ? regs : [];
        if (safeRegs.some((reg) => reg.tournamentId === tournamentId && reg.teamId === myTeam.id)) return showToast('Already registered', 'warning');
        safeRegs.push({
          id: `reg-${Date.now()}`,
          tournamentId,
          tournamentName: tournament.name,
          teamId: myTeam.id,
          teamName: myTeam.name,
          captainId: user.id,
          status: 'registered',
          createdAt: new Date().toISOString()
        });
        await saveData(DB_KEYS.tournamentRegs, safeRegs);
        addActivity(`Team ${myTeam.name} registered in ${tournament.name}`, user.name);
        renderTeamPanel();
        showToast('Team registered successfully', 'success');
      } catch (err) {
        console.error('registerTeamInTournament error:', err);
        showToast('Failed to register team', 'error');
      }
    }

    async function applySettingsSync() {
      try {
        const settings = await loadData('crazyTown_settings', { maintenance: false, notifications: [] });
        const user = await getCurrentUser();
        if (settings?.maintenance && !isAdmin(user)) {
          const bookingForm = document.getElementById('bookingForm');
          if (bookingForm) {
            bookingForm.querySelectorAll('input,select,textarea,button').forEach((el) => { el.disabled = true; });
          }
          showToast('Maintenance mode is active. Booking temporarily disabled.', 'warning');
        }
        const lastNotification = (settings?.notifications || [])[0];
        if (lastNotification) {
          showToast(`Admin Notice: ${lastNotification.text}`, 'info');
        }
      } catch (e) {
        console.warn('applySettingsSync error:', e);
      }
    }

    async function renderAdminPanel() {
      try {
        const users = await getUsers();
        const bookings = await getBookings();
        const leaderboard = await getLeaderboard();
        const safeUsers = Array.isArray(users) ? users : [];
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
        const revenue = safeBookings.reduce((sum, booking) => sum + Number(booking.price || 0), 0);
        document.getElementById('adminRevenue').textContent = `${revenue.toFixed(0)} EGP`;
        document.getElementById('adminBookings').textContent = safeBookings.length;
        document.getElementById('adminUsers').textContent = safeUsers.length;

        document.getElementById('adminBookingsTable').innerHTML = `
          <thead><tr><th>Ticket</th><th>User</th><th>Date</th><th>Status</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            ${safeBookings.length ? safeBookings.map((booking) => `
              <tr>
                <td>${booking.ticketId}</td>
                <td>${booking.name}</td>
                <td>${booking.date} ${booking.time}</td>
                <td><span class="status-pill ${booking.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}">${booking.status}</span></td>
                <td>${Number(booking.price || 0).toFixed(0)} EGP</td>
                <td>
                  <button class="btn btn-outline" onclick="toggleBookingStatus('${booking.id}')">${booking.status === 'Confirmed' ? 'Set Pending' : 'Confirm'}</button>
                  <button class="btn btn-outline" onclick="deleteBooking('${booking.id}')">Delete</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6">No bookings</td></tr>'}
          </tbody>
        `;

        document.getElementById('adminUsersTable').innerHTML = `
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>
            ${safeUsers.map((user) => `
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${isAdmin(user) ? 'Admin' : 'Player'}${user.isBanned ? ' (Banned)' : ''}</td>
                <td>${Number(user.balance || 0).toFixed(0)} EGP</td>
                <td>
                  ${user.id !== DEFAULT_ADMIN.id ? `<button class="btn btn-outline" onclick="toggleAdminRole('${user.id}')">${isAdmin(user) ? 'Remove Admin' : 'Make Admin'}</button>` : ''}
                  ${user.id !== DEFAULT_ADMIN.id ? `<button class="btn btn-outline" onclick="toggleBan('${user.id}')">${user.isBanned ? 'Unban' : 'Ban'}</button>` : ''}
                  ${user.id !== DEFAULT_ADMIN.id ? `<button class="btn btn-outline" onclick="deleteUser('${user.id}')">Delete</button>` : ''}
                  <button class="btn btn-outline" onclick="adjustBalancePrompt('${user.id}')">Balance +/-</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        `;

        document.getElementById('adminLeaderboardTable').innerHTML = `
          <thead><tr><th>Player</th><th>Points</th><th>Actions</th></tr></thead>
          <tbody>
            ${safeLeaderboard.map((entry) => `
              <tr>
                <td>${entry.name}</td>
                <td>${entry.points}</td>
                <td>
                  <button class="btn btn-outline" onclick="editLeaderboardEntry('${entry.id}')">Edit</button>
                  <button class="btn btn-outline" onclick="deleteLeaderboardEntry('${entry.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        `;

        const activity = await loadData(DB_KEYS.activity, []);
        const safeActivity = Array.isArray(activity) ? activity : [];
        document.getElementById('activityLogList').innerHTML = safeActivity.slice(0, 30).map((item) => (
          `<div style="margin-bottom:8px;"><strong>${new Date(item.at).toLocaleString()}</strong> - ${item.actor}: ${item.action}</div>`
        )).join('') || '<div>No activity yet.</div>';
      } catch (e) {
        console.error('renderAdminPanel error:', e);
      }
    }

    async function toggleBookingStatus(bookingId) {
      try {
        const bookings = await getBookings();
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const target = safeBookings.find((booking) => booking.id === bookingId);
        if (!target) return;
        target.status = target.status === 'Confirmed' ? 'Pending' : 'Confirmed';
        await saveBookings(safeBookings);
        addActivity(`Booking ${target.ticketId} marked ${target.status}`, 'Admin');
        await renderAdminPanel();
      } catch (e) {
        console.error('toggleBookingStatus error:', e);
      }
    }

    async function deleteBooking(bookingId) {
      try {
        const bookings = await getBookings();
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        const target = safeBookings.find((booking) => booking.id === bookingId);
        const updated = safeBookings.filter((booking) => booking.id !== bookingId);
        await saveBookings(updated);
        addActivity(`Booking deleted: ${target ? target.ticketId : bookingId}`, 'Admin');
        await renderAdminPanel();
        showToast('Booking deleted', 'warning');
      } catch (e) {
        console.error('deleteBooking error:', e);
      }
    }

    async function toggleAdminRole(userId) {
      try {
        const users = await getUsers();
        const safeUsers = Array.isArray(users) ? users : [];
        const user = safeUsers.find((item) => item.id === userId);
        if (!user) return;
        if (!Array.isArray(user.roles)) user.roles = ['player'];
        if (user.roles.includes('admin')) {
          user.roles = user.roles.filter((role) => role !== 'admin');
        } else {
          user.roles.push('admin');
        }
        await saveUsers(safeUsers);
        addActivity(`Role updated for ${user.name}`, 'Admin');
        await renderAdminPanel();
        checkAuth();
      } catch (e) {
        console.error('toggleAdminRole error:', e);
      }
    }

    async function toggleBan(userId) {
      try {
        const users = await getUsers();
        const safeUsers = Array.isArray(users) ? users : [];
        const user = safeUsers.find((item) => item.id === userId);
        if (!user) return;
        user.isBanned = !user.isBanned;
        await saveUsers(safeUsers);
        addActivity(`${user.name} ${user.isBanned ? 'banned' : 'unbanned'}`, 'Admin');
        await renderAdminPanel();
      } catch (e) {
        console.error('toggleBan error:', e);
      }
    }

    async function deleteUser(userId) {
      try {
        let users = await getUsers();
        const safeUsers = Array.isArray(users) ? users : [];
        const deleted = safeUsers.find((user) => user.id === userId);
        users = safeUsers.filter((user) => user.id !== userId);
        await saveUsers(users);
        const bookings = await getBookings();
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        await saveBookings(safeBookings.filter((booking) => booking.userId !== userId));
        addActivity(`User deleted: ${deleted ? deleted.name : userId}`, 'Admin');
        await renderAdminPanel();
      } catch (e) {
        console.error('deleteUser error:', e);
      }
    }

    async function adjustBalancePrompt(userId) {
      try {
        const amount = Number(prompt('Enter amount to add\remove (example: 100 or -50):', '100'));
        if (Number.isNaN(amount)) return;
        const users = await getUsers();
        const safeUsers = Array.isArray(users) ? users : [];
        const user = safeUsers.find((item) => item.id === userId);
        if (!user) return;
        user.balance = Number(user.balance || 0) + amount;
        await saveUsers(safeUsers);
        addActivity(`Balance changed for ${user.name}: ${amount > 0 ? '+' : ''}${amount} EGP`, 'Admin');
        await renderAdminPanel();
        checkAuth();
      } catch (e) {
        console.error('adjustBalancePrompt error:', e);
      }
    }

    async function addLeaderboardEntry() {
      try {
        const name = document.getElementById('lbName').value.trim();
        const points = Number(document.getElementById('lbPoints').value || 0);
        if (!name) return showToast('Enter player name', 'error');
        const entries = await getLeaderboard();
        const safeEntries = Array.isArray(entries) ? entries : [];
        safeEntries.push({ id: `lb-${Date.now()}`, name, points });
        await saveLeaderboard(safeEntries);
        addActivity(`Leaderboard add: ${name} (${points})`, 'Admin');
        document.getElementById('lbName').value = '';
        document.getElementById('lbPoints').value = '';
        await renderAdminPanel();
        showToast('Leaderboard updated', 'success');
      } catch (e) {
        console.error('addLeaderboardEntry error:', e);
      }
    }

    async function editLeaderboardEntry(entryId) {
      try {
        const entries = await getLeaderboard();
        const safeEntries = Array.isArray(entries) ? entries : [];
        const entry = safeEntries.find((item) => item.id === entryId);
        if (!entry) return;
        const newPoints = Number(prompt(`Edit points for ${entry.name}`, String(entry.points)));
        if (Number.isNaN(newPoints)) return;
        entry.points = newPoints;
        await saveLeaderboard(safeEntries);
        addActivity(`Leaderboard edit: ${entry.name} -> ${newPoints}`, 'Admin');
        await renderAdminPanel();
      } catch (e) {
        console.error('editLeaderboardEntry error:', e);
      }
    }

    async function deleteLeaderboardEntry(entryId) {
      try {
        const entries = await getLeaderboard();
        const safeEntries = Array.isArray(entries) ? entries : [];
        const filtered = safeEntries.filter((entry) => entry.id !== entryId);
        await saveLeaderboard(filtered);
        addActivity(`Leaderboard entry removed: ${entryId}`, 'Admin');
        await renderAdminPanel();
      } catch (e) {
        console.error('deleteLeaderboardEntry error:', e);
      }
    }

    async function clearAllData() {
      if (!confirm('Are you sure? This will clear users/bookings/leaderboard except root admin.')) return;
      localStorage.removeItem(DB_KEYS.users);
      localStorage.removeItem(DB_KEYS.bookings);
      localStorage.removeItem(DB_KEYS.activity);
      localStorage.removeItem(DB_KEYS.leaderboard);
      clearCurrentUser();
      await ensureSeedData();
      addActivity('All data cleared by admin', 'Admin');
      await renderAdminPanel();
      checkAuth();
      showToast('All data cleared', 'warning');
    }

    function exportBookingsToCSV() {
      const bookings = getBookings();
      const rows = [['Ticket ID', 'Player No', 'Name', 'Phone', 'Date', 'Time', 'Players', 'Mission', 'Price', 'Status', 'Created At']];
      bookings.forEach((booking) => {
        rows.push([booking.ticketId, booking.playerNo, booking.name, booking.phone, booking.date, booking.time, booking.players, booking.mission, booking.price, booking.status, booking.createdAt]);
      });
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crazy-town-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addActivity('Bookings exported to CSV', 'Admin');
      showToast('Export complete', 'success');
    }

function maybePlayAdminNotification() {
  getCurrentUser().then(user => {
    if (!isAdmin(user)) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  }).catch(e => console.error('maybePlayAdminNotification error:', e));
}

function switchLeaderboard(type) {
      document.querySelectorAll('.leaderboard-tab').forEach((tab) => tab.classList.remove('active'));
      if (window.event && window.event.target) {
        const clicked = window.event.target.closest('.leaderboard-tab');
        if (clicked) clicked.classList.add('active');
      }
      document.getElementById('leaderboard-tournaments').style.display = 'none';
      document.getElementById('leaderboard-players').style.display = 'none';
      document.getElementById('leaderboard-teams').style.display = 'none';
      if (type === 'tournaments') document.getElementById('leaderboard-tournaments').style.display = 'flex';
      if (type === 'players') document.getElementById('leaderboard-players').style.display = 'flex';
      if (type === 'teams') document.getElementById('leaderboard-teams').style.display = 'flex';
    }

    function scrollToTopSmooth() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('scroll', () => {
      const header = document.getElementById('header');
      const backTopButton = document.querySelector('.floating-top-btn');
      if (window.scrollY > 100) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
      if (backTopButton) backTopButton.classList.toggle('visible', window.scrollY > 500);
      updateActiveNavLink();
    });

    function toggleMenu() { document.getElementById('navLinks').classList.toggle('active'); }

    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => document.getElementById('navLinks').classList.remove('active'));
    });

    const navSectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const pageSections = navSectionLinks
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    function updateActiveNavLink() {
      if (!navSectionLinks.length || !pageSections.length) return;
      const marker = window.scrollY + 140;
      let activeId = pageSections[0].id;
      pageSections.forEach((section) => {
        if (marker >= section.offsetTop) activeId = section.id;
      });
      navSectionLinks.forEach((link) => {
        const targetId = link.getAttribute('href').slice(1);
        link.classList.toggle('active', targetId === activeId);
      });
    }

    const dateInput = document.getElementById('bookingDate');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, observerOptions);
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function onAnchorClick(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Attach all UI functions to window object for onclick handlers
    window.openLogin = openLogin;
    window.openRegister = openRegister;
    window.openForgot = openForgot;
    window.closeModal = closeModal;
    window.switchModal = switchModal;
    window.handleRegister = handleRegister;
    window.handleLogin = handleLogin;
    window.handleForgotPassword = handleForgotPassword;
    window.socialLogin = socialLogin;
    window.checkAuth = checkAuth;
    window.logout = logout;
    window.openAdminPanel = openAdminPanel;
    window.openVipPortal = openVipPortal;
    window.openElitePortal = openElitePortal;
    window.showDashboard = showDashboard;
    window.showBookings = showBookings;
    window.showProfile = showProfile;
    window.saveProfile = saveProfile;
    window.openTeamHub = openTeamHub;
    window.openOperationsCenter = openOperationsCenter;
    window.openSupportCenter = openSupportCenter;
    window.openOwnerControlPage = openOwnerControlPage;
    window.toggleUserDropdown = toggleUserDropdown;
    window.closeUserDropdown = closeUserDropdown;
    window.showToast = showToast;
    window.addItemToCart = addItemToCart;
    window.updateCartQty = updateCartQty;
    window.toggleCartPanel = toggleCartPanel;
    window.checkoutCart = checkoutCart;
    window.renderCart = renderCart;
    window.sendChatMessage = sendChatMessage;
    window.toggleSupportChat = toggleSupportChat;
    window.createTeam = createTeam;
    window.inviteToTeam = inviteToTeam;
    window.acceptTeamInvite = acceptTeamInvite;
    window.renderTeamPanel = renderTeamPanel;
    window.registerTeamInTournament = registerTeamInTournament;
    window.scrollToTopSmooth = scrollToTopSmooth;
    window.toggleMenu = toggleMenu;
    window.calculatePrice = calculatePrice;
    window.handleBooking = handleBooking;
    window.missionPrice = missionPrice;
    window.generateTicketId = generateTicketId;
    window.renderTicket = renderTicket;
    window.applyDiscount = applyDiscount;
    window.applyEliteDiscount = applyEliteDiscount;
    window.eliteDiscountRate = eliteDiscountRate;
    window.exportBookingsToCSV = exportBookingsToCSV;
    window.addLeaderboardEntry = addLeaderboardEntry;
    window.editLeaderboardEntry = editLeaderboardEntry;
    window.deleteLeaderboardEntry = deleteLeaderboardEntry;
    window.clearAllData = clearAllData;
    window.toggleBookingStatus = toggleBookingStatus;
    window.deleteBooking = deleteBooking;
    window.toggleAdminRole = toggleAdminRole;
    window.toggleBan = toggleBan;
    window.deleteUser = deleteUser;
    window.adjustBalancePrompt = adjustBalancePrompt;
    window.switchLeaderboard = switchLeaderboard;
    window.updateActiveNavLink = updateActiveNavLink;
    window.sendFriendRequest = sendFriendRequest;
    window.updateFriendRequest = updateFriendRequest;
    window.cancelFriendRequest = cancelFriendRequest;
    window.renderFriendList = renderFriendList;
    window.getCart = getCart;
    window.saveCartItems = saveCartItems;
    window.initShopCartButtons = initShopCartButtons;
    window.renderNews = renderNews;
    window.renderChatMessages = renderChatMessages;
    window.renderAdminPanel = renderAdminPanel;

    // Attach core data functions to window for HTML onclick access
    window.getUsers = getUsers;
    window.saveUsers = saveUsers;
    window.getBookings = getBookings;
    window.saveBookings = saveBookings;
    window.getLeaderboard = getLeaderboard;
    window.saveLeaderboard = saveLeaderboard;
    window.getLocalUser = getLocalUser;
    window.addActivity = addActivity;
    window.loadData = loadData;
    window.saveData = saveData;
    window.ensureSeedData = ensureSeedData;
    window.applySettingsSync = applySettingsSync;
    

    
    document.addEventListener('DOMContentLoaded', () => {
      ensureSeedData();
      checkAuth();
      renderNews();
      renderChatMessages();
      renderFriendList();
      calculatePrice();
      applySettingsSync();
      initShopCartButtons();
      renderCart();
      renderTeamPanel();
      updateActiveNavLink();
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            sendChatMessage();
          }
        });
      }
    });

    window.addEventListener('storage', (event) => {
      const syncKeys = ['crazyTown_users', 'crazyTown_settings', 'crazyTown_news', 'crazyTown_coupons'];
      if (!syncKeys.includes(event.key || '')) return;
      checkAuth();
      renderNews();
      applySettingsSync();
    });
  