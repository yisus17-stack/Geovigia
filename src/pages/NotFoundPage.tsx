import { Link } from 'react-router-dom'
function NotFoundPage() { return <main className="not-found"><p className="eyebrow">404</p><h1>Esta vista no existe.</h1><Link className="button" to="/">Volver al inicio</Link></main> }
export default NotFoundPage
