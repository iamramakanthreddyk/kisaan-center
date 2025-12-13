import { useLocation, useNavigate } from 'react-router-dom';

export function RouteDebugger() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ 
      position: 'fixed', 
      top: '70px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div><strong>Current Route:</strong> {location.pathname}</div>
      <div><strong>Search:</strong> {location.search}</div>
      <div><strong>Hash:</strong> {location.hash}</div>
      <button 
        onClick={() => navigate('/owner')}
        style={{ marginTop: '5px', padding: '2px 5px' }}
      >
        Go to Owner
      </button>
      <button 
        onClick={() => navigate('/simple-transactions')}
        style={{ marginTop: '5px', padding: '2px 5px', marginLeft: '5px' }}
      >
        Go to Quick Sale
      </button>
    </div>
  );
}