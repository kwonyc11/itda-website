// 메뉴의 보이는 상태와 접근성 상태를 함께 갱신한다.
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
function setMenu(open) {
  links.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
}
toggle.addEventListener("click", () => setMenu(!links.classList.contains("open")));
links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("click", e => { if (!e.target.closest(".nav")) setMenu(false); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && links.classList.contains("open")) { setMenu(false); toggle.focus(); }
});
matchMedia("(min-width: 761px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

const nav = document.querySelector(".nav");
const navAnchors = [...links.querySelectorAll("a")];
const sections = navAnchors.map(a => document.querySelector(a.hash));
let scheduled = false;
function updateNavigation() {
  nav.classList.toggle("scrolled", scrollY > 10);
  let current = null;
  sections.forEach(section => { if (section.getBoundingClientRect().top <= 160) current = section.id; });
  if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = sections.at(-1).id;
  navAnchors.forEach(a => {
    if (a.hash === `#${current}`) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
  scheduled = false;
}
addEventListener("scroll", () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); } }, {passive:true});
updateNavigation();

// 큰 아카이브 전체가 뷰포트에 들어오기를 기다리지 않고 각 항목을 표시한다.
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const revealTargets = document.querySelectorAll(".section-heading, .about-statement, .about-copy, .event-card, .round-row, .member-card, .contact-layout, .ruled");
if (!motionPreference.matches && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.06 });
  revealTargets.forEach(el => { el.classList.add("reveal"); observer.observe(el); });
  motionPreference.addEventListener("change", e => {
    if (e.matches) { observer.disconnect(); revealTargets.forEach(el => el.classList.add("in")); }
  });
}
