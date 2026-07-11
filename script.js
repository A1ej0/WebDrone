/* ========================================
   AeroVista — Interactive JavaScript
   Dynamic Gallery, 360° Viewer, Form, Animations
   ======================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // ==================== LOAD MANIFEST ====================
  let manifest = { gallery: [], panorama: [] };
  try {
    const res = await fetch('manifest.json');
    if (res.ok) {
      manifest = await res.json();
    } else {
      console.warn('manifest.json not found. Run: node generate-manifest.js');
    }
  } catch (e) {
    console.warn('Could not load manifest.json:', e);
  }

  // ==================== NAVBAR ====================
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = navToggle.querySelectorAll('span');
    if (navLinks.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  navLinks.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const spans = navToggle.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    });
  });

  // ==================== DYNAMIC GALLERY ====================
  const track = document.getElementById('galleryTrack');
  const dotsContainer = document.getElementById('galleryDots');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  const progressBar = document.getElementById('galleryProgress');
  const heroBgImg = document.getElementById('heroBgImg');

  // Build slides from manifest
  if (manifest.gallery.length > 0) {
    // Set hero background to the first gallery image
    heroBgImg.src = manifest.gallery[0].src;

    manifest.gallery.forEach(item => {
      const slide = document.createElement('div');
      slide.className = 'gallery__slide';
      slide.innerHTML = `
        <img src="${item.src}" alt="${item.alt}" loading="lazy">
        <div class="gallery__slide-overlay">
          <div class="gallery__slide-title">${item.title}</div>
          <div class="gallery__slide-desc">${item.desc}</div>
        </div>
      `;
      track.appendChild(slide);
    });
  }

  const slides = track.querySelectorAll('.gallery__slide');
  const totalSlides = slides.length;
  let currentSlide = 0;
  let autoplayInterval;
  let progressInterval;
  const AUTOPLAY_DELAY = 5000;

  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = `gallery__dot ${i === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  function goToSlide(index) {
    currentSlide = index;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dotsContainer.querySelectorAll('.gallery__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
    resetAutoplay();
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % totalSlides);
  }

  function prevSlide() {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  }

  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  function startProgress() {
    let progress = 0;
    const step = 100 / (AUTOPLAY_DELAY / 30);
    progressInterval = setInterval(() => {
      progress += step;
      progressBar.style.width = `${Math.min(progress, 100)}%`;
      if (progress >= 100) clearInterval(progressInterval);
    }, 30);
  }

  function resetAutoplay() {
    clearInterval(autoplayInterval);
    clearInterval(progressInterval);
    progressBar.style.width = '0%';
    startProgress();
    autoplayInterval = setInterval(nextSlide, AUTOPLAY_DELAY);
  }

  // Swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextSlide() : prevSlide();
    }
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  });

  if (totalSlides > 0) resetAutoplay();

  // ==================== DYNAMIC 360° PANORAMA ====================
  let panoramaViewer = null;
  const panoramaLoading = document.getElementById('panoramaLoading');
  const panoramaHint = document.getElementById('panoramaHint');
  const panoramaOuter = document.getElementById('panoramaOuter');
  const panoramaThumbs = document.getElementById('panoramaThumbs');

  // Build thumbnails from manifest
  if (manifest.panorama.length > 0) {
    manifest.panorama.forEach((item, i) => {
      const thumb = document.createElement('div');
      thumb.className = `panorama__thumb ${i === 0 ? 'active' : ''}`;
      thumb.setAttribute('data-src', item.src);
      thumb.innerHTML = `
        <img src="${item.src}" alt="${item.alt}" loading="lazy">
        <div class="panorama__thumb-label">${item.label}</div>
      `;
      thumb.addEventListener('click', () => {
        document.querySelectorAll('.panorama__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        initPanorama(item.src);
      });
      panoramaThumbs.appendChild(thumb);
    });
  }

  function initPanorama(imageSrc) {
    panoramaLoading.classList.remove('hidden');
    panoramaHint.classList.remove('hidden');

    // Destroy existing viewer
    if (panoramaViewer) {
      try { panoramaViewer.destroy(); } catch (e) { /* ignore */ }
      panoramaViewer = null;
    }

    // Recreate a fresh container for Pannellum
    const oldContainer = document.getElementById('panoramaViewer');
    if (oldContainer) oldContainer.remove();
    const newContainer = document.createElement('div');
    newContainer.id = 'panoramaViewer';
    newContainer.style.width = '100%';
    newContainer.style.height = '100%';
    panoramaOuter.insertBefore(newContainer, panoramaOuter.firstChild);

    panoramaViewer = pannellum.viewer('panoramaViewer', {
      type: 'equirectangular',
      panorama: imageSrc,
      autoLoad: true,
      autoRotate: -2,
      autoRotateInactivityDelay: 3000,
      compass: false,
      showZoomCtrl: true,
      showFullscreenCtrl: true,
      mouseZoom: true,
      hfov: 110,
      minHfov: 50,
      maxHfov: 120,
      friction: 0.15,
      yaw: 0,
      pitch: 0,
      draggable: true,
      disableKeyboardCtrl: false
    });

    panoramaViewer.on('load', () => {
      panoramaLoading.classList.add('hidden');
    });

    let hintHidden = false;
    const hideHint = () => {
      if (!hintHidden) {
        panoramaHint.classList.add('hidden');
        hintHidden = true;
      }
    };
    panoramaOuter.addEventListener('mousedown', hideHint);
    panoramaOuter.addEventListener('touchstart', hideHint, { passive: true });
  }

  // Load first 360 image
  if (manifest.panorama.length > 0) {
    initPanorama(manifest.panorama[0].src);
  }

  // ==================== CONTACT FORM ====================
  const contactForm = document.getElementById('contactForm');
  const formContainer = document.getElementById('formContainer');
  const formSuccess = document.getElementById('formSuccess');

  const dateInput = document.getElementById('projectDate');
  if (dateInput) {
    dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
  }

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
      projectType: document.getElementById('projectType').value,
      description: document.getElementById('projectDesc').value,
      date: document.getElementById('projectDate').value,
      name: document.getElementById('contactName').value,
      phone: document.getElementById('contactPhone').value,
      email: document.getElementById('contactEmail').value
    };

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Enviando...';
    submitBtn.disabled = true;

    fetch('https://formspree.io/f/xnjeapgd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        servicio: formData.projectType,
        descripcion: formData.description,
        fecha: formData.date,
        nombre: formData.name,
        telefono: formData.phone,
        email: formData.email
      })
    })
    .then(response => {
      if (!response.ok) throw new Error('Error al enviar el formulario');

      formContainer.style.display = 'none';
      formSuccess.classList.add('show');

      const waMessage = encodeURIComponent(
        `🚁 *Nueva Solicitud — AeroVista*\n\n` +
        `📋 *Servicio:* ${formData.projectType}\n` +
        `📝 *Descripción:* ${formData.description}\n` +
        `📅 *Fecha:* ${formData.date}\n` +
        `👤 *Nombre:* ${formData.name}\n` +
        `📱 *Teléfono:* ${formData.phone}\n` +
        `📧 *Email:* ${formData.email}`
      );

      document.querySelectorAll('[href*="wa.me"]').forEach(link => {
        const baseUrl = link.href.split('?')[0];
        link.href = `${baseUrl}?text=${waMessage}`;
      });

      console.log('Form submitted to Formspree:', formData);
    })
    .catch(error => {
      console.error('Formspree error:', error);
      alert('Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.');
      submitBtn.innerHTML = 'Enviar Solicitud <i data-lucide="send" style="width:18px;height:18px;"></i>';
      submitBtn.disabled = false;
      if (window.lucide) lucide.createIcons();
    });
  });

  // ==================== SCROLL REVEAL ANIMATIONS ====================
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  // ==================== PARALLAX HERO BACKGROUND ====================
  const heroBg = document.querySelector('.hero__bg img');
  window.addEventListener('scroll', () => {
    if (heroBg && window.scrollY < window.innerHeight) {
      heroBg.style.transform = `scale(1.1) translateY(${window.scrollY * 0.3}px)`;
    }
  }, { passive: true });

  // ==================== SMOOTH SCROLL ====================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.pageYOffset - 80,
          behavior: 'smooth'
        });
      }
    });
  });

  // ==================== TILT EFFECT ON SERVICE CARDS ====================
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const rotateX = (e.clientY - rect.top - rect.height / 2) / 20;
      const rotateY = (rect.width / 2 - (e.clientX - rect.left)) / 20;
      card.style.transform = `translateY(-6px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
});
