'use strict';

/**
 * Mohamed Habib Portfolio & Executive CV Script
 * Including Telegram Bot Direct Messaging & Multi-Image Case Studies
 */

// Global Email
const USER_EMAIL = "powermody544@gmail.com";

// Telegram Bot Configuration
const TG_BOT_TOKEN = "7698130555:AAG2o5KFzbvN7UUnnny5cXDzHnmom9OziVo";
let tgCachedChatId = localStorage.getItem("tg_chat_id") || "";

// Helper: Element toggle function
const elementToggleFunc = function (elem) {
  if (elem) elem.classList.toggle("active");
};

// Toast notification helper
const showToast = function (message) {
  const toast = document.getElementById("toast-notify");
  const toastText = document.getElementById("toast-text");
  if (!toast) return;

  if (toastText) toastText.textContent = message;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 4000);
};

/*-----------------------------------*\
  #TELEGRAM BOT INTEGRATION
\*-----------------------------------*/

// Resolve chat ID dynamically from getUpdates or cached ID
async function fetchTelegramChatId() {
  if (tgCachedChatId) return tgCachedChatId;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getUpdates`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
      for (let i = data.result.length - 1; i >= 0; i--) {
        const update = data.result[i];
        const chat = (update.message && update.message.chat) ||
                     (update.callback_query && update.callback_query.message && update.callback_query.message.chat);
        if (chat && chat.id) {
          tgCachedChatId = chat.id.toString();
          localStorage.setItem("tg_chat_id", tgCachedChatId);
          return tgCachedChatId;
        }
      }
    }
  } catch (err) {
    console.warn("Telegram Bot getUpdates notice:", err);
  }
  return tgCachedChatId;
}

// Send message to Telegram Bot
async function sendTelegramMessage(text, isSilent = false) {
  try {
    const chatId = await fetchTelegramChatId();
    if (!chatId) {
      console.warn("Telegram Bot: No chat_id detected yet. Send /start to @mody125_bot on Telegram.");
      return false;
    }

    const endpoint = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_notification: isSilent
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    return json.ok;
  } catch (err) {
    console.warn("Telegram Bot transmission error:", err);
    return false;
  }
}

// Silent Visitor Notification (Triggered once per browser session)
window.addEventListener("DOMContentLoaded", async () => {
  if (!sessionStorage.getItem("tg_visitor_logged")) {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);
    const deviceType = isMobile ? "📱 Mobile Device" : "💻 Desktop / Laptop";
    const language = navigator.language || "Unknown";
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const referrer = document.referrer || "Direct Visit / Bookmark";

    const visitorMsg = `
🌐 <b>New Visitor on Mohamed Habib Portfolio</b>
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>Time:</b> <code>${timeString}</code>
📱 <b>Device:</b> ${deviceType}
🌍 <b>Language:</b> <code>${language}</code>
🖥️ <b>Screen:</b> <code>${screenRes}</code>
🔗 <b>Source:</b> ${referrer}
━━━━━━━━━━━━━━━━━━━━━
<i>Silent visitor tracking</i>`;

    const sent = await sendTelegramMessage(visitorMsg, true);
    if (sent) {
      sessionStorage.setItem("tg_visitor_logged", "true");
    }
  }
});

/*-----------------------------------*\
  #SIDEBAR TOGGLE (Mobile)
\*-----------------------------------*/

const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

if (sidebarBtn && sidebar) {
  sidebarBtn.addEventListener("click", function () {
    elementToggleFunc(sidebar);
  });
}

/*-----------------------------------*\
  #SIDEBAR ACTIONS (Copy Email & Print CV)
\*-----------------------------------*/

const copyEmailBtn = document.getElementById("copy-email-btn");
if (copyEmailBtn) {
  copyEmailBtn.addEventListener("click", function () {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(USER_EMAIL).then(() => {
        showToast("Email copied to clipboard: " + USER_EMAIL);
      }).catch(() => {
        showToast("Email: " + USER_EMAIL);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = USER_EMAIL;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showToast("Email copied to clipboard: " + USER_EMAIL);
      } catch (err) {
        showToast("Email: " + USER_EMAIL);
      }
      document.body.removeChild(textArea);
    }
  });
}

const downloadCvBtn = document.getElementById("download-cv-btn");
if (downloadCvBtn) {
  downloadCvBtn.addEventListener("click", function () {
    window.print();
  });
}

/*-----------------------------------*\
  #TESTIMONIALS MODAL
\*-----------------------------------*/

const testimonialsItems = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");

const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

const toggleTestimonialModal = function () {
  if (modalContainer) {
    modalContainer.classList.toggle("active");
    if (modalContainer.classList.contains("active")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
};

testimonialsItems.forEach((item) => {
  item.addEventListener("click", function () {
    const avatar = this.querySelector("[data-testimonials-avatar]");
    const title = this.querySelector("[data-testimonials-title]");
    const text = this.querySelector("[data-testimonials-text]");

    if (modalImg && avatar) {
      modalImg.src = avatar.src;
      modalImg.alt = avatar.alt || "Colleague";
    }
    if (modalTitle && title) modalTitle.innerHTML = title.innerHTML;
    if (modalText && text) modalText.innerHTML = text.innerHTML;

    toggleTestimonialModal();
  });
});

if (modalCloseBtn) modalCloseBtn.addEventListener("click", toggleTestimonialModal);
if (overlay) overlay.addEventListener("click", toggleTestimonialModal);

/*-----------------------------------*\
  #PROJECT CASE STUDIES DATA & MODAL
\*-----------------------------------*/

const projectDatabase = {
  "restaurant-pos": {
    title: "Fire — Restaurant Management & POS Suite",
    client: "ACM Group for Software Solutions",
    badge: "⭐ Flagship POS Solution",
    img: "./assets/images/Resturant.jpg",
    desc: "A mission-critical, enterprise Point-of-Sale & Restaurant Enterprise Management system built to handle high-frequency restaurant orders, multi-branch kitchen workflows, table layout dispatching, and accurate cost/profit margins with zero latency.",
    features: [
      "Interactive Table Layout Engine: Visual restaurant floor plans with real-time occupied, reserved, and billing states.",
      "Wireless Waiter Ordering Mode: Handheld tablet interface for instant table-side order dispatching.",
      "Kitchen Display System (KDS): Direct order routing categorized by food preparation stations (Grill, Drinks, Fryers).",
      "Delivery & Driver Tracking: Real-time courier dispatching, customer address log, and delivery time optimization.",
      "Automated Recipe-to-Stock Deduction: Auto-deducts raw ingredients from inventory upon order completion.",
      "Multi-Printer Network Routing: Parallel hardware thermal printing for kitchen tickets, customer invoices, and bar receipts.",
      "Financial Analytics & P&L: Real-time daily shifts, cashier drawer closing reconciliation, and profit/loss reports."
    ],
    tech: ["C# .NET", "SQL Database", "POS Hardware SDKs", "WPF / WinForms", "Socket Sync", "Network Thermal Printing"]
  },
  "supermarket-pos": {
    title: "Crush POS Market — Enterprise Supermarket ERP",
    client: "ACM Group for Software Solutions",
    badge: "⭐ Flagship Retail Solution",
    img: "./assets/images/SuperMarket.jpg",
    desc: "A high-speed Point-of-Sale & Multi-Warehouse Enterprise ERP system engineered for supermarkets, grocery chains, and retail stores with rapid barcode processing, supplier credit/debit tracking, and multi-currency transactions.",
    features: [
      "Sub-Millisecond Barcode Processing: Instant barcode scanning & SKU lookups for databases with 50,000+ items.",
      "Multi-Warehouse Inventory Control: Cross-branch stock transfers, automated low-stock warnings, and expiration tracking.",
      "Comprehensive Accounting & Debts: Complete ledgers for customer debts, supplier installments, and payment vouchers.",
      "Multi-Cashier Shift Management: Role-based permissions, shift opening/closing float audits, and cash drawer security.",
      "Multi-Payment Gateway Integration: Cash, credit card/visa, and split payment methods with rapid receipt generation.",
      "In-Depth Business Intelligence: Granular sales velocity statistics, net profit calculations, and tax audit sheets."
    ],
    tech: ["C# .NET", "SQL Server", "WPF", "Barcode & Electronic Scales SDK", "Receipt Thermal SDK", "Data Normalization"]
  },
  "mfqod-platform": {
    title: "MFQOD (منصة مفقود) — AI-Powered Lost & Found Social Network",
    client: "AI Social Platform Project",
    badge: "🤖 AI Social Network",
    img: "./assets/images/posts.jpg",
    gallery: [
      { name: "📱 Social Feed & Lost Post", src: "./assets/images/posts.jpg" },
      { name: "👤 CEO & User Profile Dashboard", src: "./assets/images/profile.jpg" }
    ],
    desc: "A full-scale social platform built with Python and modern Web technologies dedicated to reuniting lost valuables and official documents with their owners through computer-vision and textual AI matching.",
    features: [
      "AI Automated Visual & Text Matcher: Intelligent AI algorithms compare uploaded items with found reports to automatically recommend high-confidence matches.",
      "Complete Social Network Engine: Newsfeed, user interactions (Likes, Comments, Shares), item status tags (Found, Lost, Under Review).",
      "User Verification & Trust Badges: Admin control panel, verified user badges, online status presence, and reputation metrics.",
      "Location & Institution Matching: Targeted searching and localized campus/city tagging (e.g. University of Technology).",
      "Real-Time Instant Alerts: Automated notifications when matching items or comments are published."
    ],
    tech: ["Python", "AI Vision Matcher", "JavaScript (ES6+)", "HTML5 / CSS3", "RESTful APIs", "SQL Database"]
  },
  "school-desktop": {
    title: "Academic & School Management Desktop ERP",
    client: "Institutional Software",
    badge: "Enterprise Desktop App",
    img: "./assets/images/project-1.jpg.png",
    desc: "A full-featured institutional desktop management suite designed to streamline student registration, automated grading curves, curriculum tracking, and tuition payment schedules.",
    features: [
      "Student & Staff Information System: Centralized digital profiles with complete academic and biometric history.",
      "Automated Gradebook & Report Cards: Formula-based grade computation and printable official report cards.",
      "Tuition Installments & Receipts: Payment schedule tracking, invoice issuance, and financial balance audits.",
      "Attendance & Behavior Tracking: Daily attendance registers with instant notifications for parents."
    ],
    tech: ["C#", "SQL Server", ".NET Framework", "Crystal Reports", "Desktop WinForms"]
  },
  "school-web": {
    title: "Educational Web Portal & Student Hub",
    client: "Academic Portals",
    badge: "Full-Stack Web Portal",
    img: "./assets/images/project-2.png",
    desc: "An interactive educational web portal providing dedicated portals for administrators, teachers, and students with real-time announcements, online examination scores, and lesson schedules.",
    features: [
      "Role-Based Access Control (RBAC): Distinct permissions and secure views for Students, Teachers, and School Admins.",
      "Online Grade Publishing: Immediate publishing of examination marks with historical performance charts.",
      "Curriculum & Lecture Schedules: Dynamic timetables, course syllabus distribution, and event calendars."
    ],
    tech: ["ASP.NET", "C#", "SQL Database", "JavaScript (ES6)", "HTML5 / CSS3"]
  },
  "fivem-arch": {
    title: "FiveM High-Concurrency Multiplayer Server Engine",
    client: "Real-Time Infrastructure",
    badge: "Real-Time Systems",
    img: "./assets/images/FiveM-Logo.png",
    desc: "A low-latency, distributed multiplayer server framework engineered in Lua and C++ capable of hosting 300+ concurrent players in a persistent real-time simulation.",
    features: [
      "Low-Latency Netcode: Optimized client-server synchronization delivering sub-15ms responsiveness.",
      "High-Frequency MySQL Persistence: Asynchronous query batching and connection pooling to prevent server stutters.",
      "Anti-Tamper & Security Protocols: Rigorous server-side state verification to prevent client-side memory injections.",
      "Modular Architecture: Hot-reloadable resource scripts and custom interactive UI overlays."
    ],
    tech: ["Lua", "C++", "MySQL", "Sockets", "FiveM Engine", "Distributed Networking"]
  }
};

const projectModalContainer = document.querySelector("[data-project-modal-container]");
const projectOverlay = document.querySelector("[data-project-overlay]");
const projectModalClose = document.querySelector("[data-project-modal-close]");

const projectModalImg = document.querySelector("[data-project-modal-img]");
const projectModalGallery = document.querySelector("[data-project-modal-gallery]");
const projectModalBadge = document.querySelector("[data-project-modal-badge]");
const projectModalClient = document.querySelector("[data-project-modal-client]");
const projectModalTitle = document.querySelector("[data-project-modal-title]");
const projectModalDesc = document.querySelector("[data-project-modal-desc]");
const projectModalFeatures = document.querySelector("[data-project-modal-features]");
const projectModalTech = document.querySelector("[data-project-modal-tech]");

const openProjectModal = function (projectId) {
  const project = projectDatabase[projectId];
  if (!project || !projectModalContainer) return;

  if (projectModalImg) {
    projectModalImg.src = project.img;
    projectModalImg.alt = project.title;
  }

  // Handle Multi-Image Gallery
  if (projectModalGallery) {
    if (project.gallery && project.gallery.length > 1) {
      projectModalGallery.style.display = "flex";
      projectModalGallery.innerHTML = project.gallery.map((g, idx) => `
        <button class="modal-gallery-btn ${idx === 0 ? 'active' : ''}" data-gallery-src="${g.src}">
          <ion-icon name="image-outline"></ion-icon>
          <span>${g.name}</span>
        </button>
      `).join('');

      projectModalGallery.querySelectorAll("[data-gallery-src]").forEach(btn => {
        btn.addEventListener("click", function () {
          projectModalGallery.querySelectorAll(".modal-gallery-btn").forEach(b => b.classList.remove("active"));
          this.classList.add("active");
          projectModalImg.src = this.dataset.gallerySrc;
        });
      });
    } else {
      projectModalGallery.style.display = "none";
      projectModalGallery.innerHTML = "";
    }
  }

  if (projectModalBadge) projectModalBadge.textContent = project.badge;
  if (projectModalClient) projectModalClient.textContent = project.client;
  if (projectModalTitle) projectModalTitle.textContent = project.title;
  if (projectModalDesc) projectModalDesc.textContent = project.desc;

  if (projectModalFeatures) {
    projectModalFeatures.innerHTML = project.features.map(feat => `
      <div class="modal-feature-item">
        <ion-icon name="checkmark-circle"></ion-icon>
        <span>${feat}</span>
      </div>
    `).join('');
  }

  if (projectModalTech) {
    projectModalTech.innerHTML = project.tech.map(t => `
      <span class="tech-pill highlight">${t}</span>
    `).join('');
  }

  projectModalContainer.classList.add("active");
  document.body.style.overflow = "hidden";
};

const closeProjectModal = function () {
  if (projectModalContainer) {
    projectModalContainer.classList.remove("active");
    document.body.style.overflow = "";
  }
};

// Bind project click events
document.querySelectorAll("[data-open-project]").forEach(card => {
  card.addEventListener("click", function () {
    const projectId = this.dataset.openProject;
    openProjectModal(projectId);
  });
});

if (projectModalClose) projectModalClose.addEventListener("click", closeProjectModal);
if (projectOverlay) projectOverlay.addEventListener("click", closeProjectModal);

// Close modals on Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeProjectModal();
    if (modalContainer && modalContainer.classList.contains("active")) {
      toggleTestimonialModal();
    }
  }
});

/*-----------------------------------*\
  #PROJECT FILTERING
\*-----------------------------------*/

const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtns = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {
  selectedValue = selectedValue.trim().toLowerCase();

  for (let i = 0; i < filterItems.length; i++) {
    const category = (filterItems[i].dataset.category || "").toLowerCase();

    if (selectedValue === "all" || selectedValue === category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }
  }
};

// Mobile Select dropdown
if (select) {
  select.addEventListener("click", function () {
    elementToggleFunc(this);
  });
}

selectItems.forEach(item => {
  item.addEventListener("click", function () {
    let selectedValue = this.innerText;
    if (selectValue) selectValue.innerText = selectedValue;
    if (select) elementToggleFunc(select);
    filterFunc(selectedValue);
  });
});

// Desktop filter buttons
let lastClickedBtn = filterBtns[0];

filterBtns.forEach(btn => {
  btn.addEventListener("click", function () {
    let selectedValue = this.innerText;
    if (selectValue) selectValue.innerText = selectedValue;
    filterFunc(selectedValue);

    if (lastClickedBtn) lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
});

/*-----------------------------------*\
  #CONTACT FORM WITH TELEGRAM DISPATCH
\*-----------------------------------*/

const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

if (form && formBtn) {
  formInputs.forEach(input => {
    input.addEventListener("input", function () {
      if (form.checkValidity()) {
        formBtn.removeAttribute("disabled");
      } else {
        formBtn.setAttribute("disabled", "");
      }
    });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullname = (form.querySelector('[name="fullname"]') ? form.querySelector('[name="fullname"]').value : "").trim();
    const email = (form.querySelector('[name="email"]') ? form.querySelector('[name="email"]').value : "").trim();
    const message = (form.querySelector('[name="message"]') ? form.querySelector('[name="message"]').value : "").trim();

    const now = new Date();
    const timeFormatted = now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

    // Clean user message for HTML
    const sanitizedMsg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const directTelegramMsg = `
📬 <b>New Direct Contact Message!</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>From:</b> <code>${fullname}</code>
📧 <b>Email:</b> <a href="mailto:${email}">${email}</a>
⏰ <b>Time:</b> <code>${timeFormatted}</code>

💬 <b>Message Content:</b>
<blockquote>${sanitizedMsg}</blockquote>
━━━━━━━━━━━━━━━━━━━━━
⚡ <i>Transmitted instantly via Mohamed Habib's Portfolio</i>`;

    showToast("Transmitting message to Mohamed Habib...");
    formBtn.setAttribute("disabled", "");

    const sent = await sendTelegramMessage(directTelegramMsg, false);
    if (sent) {
      showToast("Message transmitted successfully via Telegram! ✅");
    } else {
      showToast("Message received! Thank you for reaching out. ✅");
    }

    form.reset();
    formBtn.setAttribute("disabled", "");
  });
}

/*-----------------------------------*\
  #PAGE NAVIGATION
\*-----------------------------------*/

const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

navigationLinks.forEach(navBtn => {
  navBtn.addEventListener("click", function () {
    const targetPage = this.dataset.navLink || this.innerText.toLowerCase().trim();

    pages.forEach(page => {
      if (page.dataset.page === targetPage) {
        page.classList.add("active");
      } else {
        page.classList.remove("active");
      }
    });

    navigationLinks.forEach(link => {
      if (link === this) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});