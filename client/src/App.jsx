import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Connect to backend server
const socket = io('http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch older messages when mounting
  useEffect(() => {
    fetch('http://localhost:5000/api/messages')
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch((err) => console.error("Error fetching chat history:", err));
  }, []);

  // Listen for real-time messages from server
  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off('receive_message');
  }, []);

  // Automatically scroll down on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send_message', { username, content: message });
      setMessage('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <h2>Enter Chat</h2>
        <form onSubmit={() => username.trim() && setIsLoggedIn(true)}>
          <input
            type="text"
            placeholder="Choose a username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>Join</button>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.chatContainer}>
      <header style={styles.header}>
        <h3>Global Messenger (Logged in as: <strong>{username}</strong>)</h3>
      </header>

      <div style={styles.messageBox}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.messageWrapper,
              justifyContent: msg.username === username ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              ...styles.messageBubble,
              backgroundColor: msg.username === username ? '#007bff' : '#e4e6eb',
              color: msg.username === username ? '#fff' : '#000'
            }}>
              <span style={styles.senderName}>{msg.username}</span>
              <p style={{ margin: 0 }}>{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={styles.inputArea}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={styles.chatInput}
        />
        <button type="submit" style={styles.sendButton}>Send</button>
      </form>
    </div>
  );
}

const styles = {
  loginContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' },
  chatContainer: { maxWidth: '600px', margin: '30px auto', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', height: '80vh' },
  header: { backgroundColor: '#f5f5f5', padding: '10px 15px', borderBottom: '1px solid #ddd' },
  messageBox: { flex: 1, padding: '15px', overflowY: 'scroll', backgroundColor: '#fafafa' },
  messageWrapper: { display: 'flex', marginBottom: '10px' },
  messageBubble: { padding: '10px 14px', borderRadius: '16px', maxWidth: '70%', position: 'relative' },
  senderName: { fontSize: '0.75rem', display: 'block', marginBottom: '3px', fontWeight: 'bold', opacity: 0.7 },
  inputArea: { display: 'flex', borderTop: '1px solid #ddd' },
  chatInput: { flex: 1, padding: '15px', border: 'none', outline: 'none' },
  sendButton: { padding: '0 25px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' },
  input: { padding: '10px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '10px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default App;