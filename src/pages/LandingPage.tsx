import { Link } from 'react-router-dom'
import logoImage from '../assets/logo_blanco.png'

function LandingPage() {
  return <main className="landing-page gov-landing">
    <header className="gov-header">
      <Link className="brand landing-brand" to="/" aria-label="GeoVigía, inicio"><img src={logoImage} alt="GeoVigía" /><small>Territorios<br />que cuentan</small></Link>
      <nav aria-label="Navegación principal"><a href="#solucion">Plataforma</a><a href="#impacto">Cómo funciona</a><Link to="/login">Iniciar sesión</Link></nav>
      <Link className="gov-access" to="/login">Acceder →</Link>
    </header>
    <section id="inicio" className="gov-hero"><div className="gov-hero-inner">
      <p className="gov-wordmark">GeoVigía</p><h1>Evidencia que protege<br />el valor de cada huerta</h1>
      <p className="gov-hero-copy">Registra, delimita y consulta información ambiental organizada para dar seguimiento técnico a cada predio.</p>
      <div className="gov-search" role="search"><span aria-hidden="true">⌕</span><input aria-label="Buscar en GeoVigía" placeholder="Busca una huerta, municipio o auditoría" readOnly /><Link to="/login" aria-label="Iniciar sesión en GeoVigía">→</Link></div>
      <div className="gov-tags"><Link to="/login">Registrar huerta</Link><Link to="/login">Huertas</Link><Link to="/login">Evidencia satelital</Link><Link to="/login">Auditorías</Link></div>
      <p className="gov-message">La información territorial se presenta como evidencia de apoyo para el seguimiento de predios y auditorías técnicas.</p>
    </div></section>
    <section id="solucion" className="gov-services"><header><p className="eyebrow">Servicios digitales</p><h2>Todo lo necesario para cuidar el territorio</h2><p>Una ruta clara desde el registro de una huerta hasta la consulta de su evidencia histórica.</p></header><div>
      <article><span>01</span><h3>Registrar una huerta</h3><p>Captura los datos del predio y delimita su polígono directamente en el mapa.</p><Link to="/login">Comenzar registro →</Link></article>
      <article><span>02</span><h3>Consultar evidencia</h3><p>Revisa imágenes históricas y datos ambientales organizados por huerta.</p><Link to="/login">Ver mapas y evidencia →</Link></article>
      <article id="impacto"><span>03</span><h3>Generar auditoría</h3><p>Organiza los registros disponibles y crea un informe técnico con Vigía.</p><Link to="/login">Ir a auditorías →</Link></article>
    </div></section>
    <footer className="gov-footer"><Link className="brand landing-brand" to="/"><img src={logoImage} alt="GeoVigía" /></Link><span>GeoVigía · Evidencia territorial para Michoacán</span><a href="#inicio">Volver arriba ↑</a></footer>
  </main>
}

export default LandingPage
