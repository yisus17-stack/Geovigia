import { Link } from 'react-router-dom'
import logoImage from '../assets/logo_blanco.png'
import michoacanLogo from '../assets/mejor.png'

function LandingPage() {
  return <main className="landing-page gov-landing">
    <header className="gov-header">
      <Link className="landing-institutional-logos" to="/" aria-label="GeoVigía, inicio"><img src={michoacanLogo} alt="Michoacán" /><span aria-hidden="true" /><img src={logoImage} alt="GeoVigía" /></Link>
      <nav aria-label="Navegación principal"><a href="#solucion">Plataforma</a><a href="#impacto">Cómo funciona</a><Link to="/login">Iniciar sesión</Link></nav>
    </header>
    <section id="inicio" className="gov-hero"><div className="gov-hero-inner">
      <p className="gov-wordmark">GeoVigía</p><h1>Evidencia que protege<br />el valor de cada huerta</h1>
      <p className="gov-hero-copy">Registra, delimita y consulta información ambiental organizada para dar seguimiento técnico a cada predio.</p>
      <div className="gov-tags"><Link to="/login">Registrar huerta</Link><Link to="/login">Huertas</Link><Link to="/login">Evidencia satelital</Link><Link to="/login">Auditorías</Link></div>
      <p className="gov-message">La información territorial se presenta como evidencia de apoyo para el seguimiento de predios y auditorías técnicas.</p>
    </div></section>
    <section id="solucion" className="gov-services"><header><p className="eyebrow">Servicios digitales</p><h2>Todo lo necesario para cuidar el territorio</h2><p>Una ruta clara desde el registro de una huerta hasta la consulta de su evidencia histórica.</p></header><div>
      <article><span>01</span><h3>Registra y delimita la huerta</h3><p>Captura el nombre, cultivo y ubicación del predio. Después dibuja su polígono directamente sobre el mapa.</p></article>
      <article><span>02</span><h3>Genera evidencia satelital</h3><p>Consulta imágenes históricas Sentinel/Landsat y la evolución anual de vegetación (NDVI) para ese polígono.</p></article>
      <article id="impacto"><span>03</span><h3>Revisa y genera la auditoría</h3><p>Analiza el dictamen ambiental, valida las alertas detectadas y genera el informe técnico con Vigía.</p></article>
    </div></section>
    <footer className="gov-footer"><Link className="landing-institutional-logos" to="/"><img src={michoacanLogo} alt="Michoacán" /><span aria-hidden="true" /><img src={logoImage} alt="GeoVigía" /></Link><span>GeoVigía · Evidencia territorial para Michoacán</span><a href="#inicio">Volver arriba ↑</a></footer>
  </main>
}

export default LandingPage
