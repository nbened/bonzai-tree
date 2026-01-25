import React, { useState, useEffect, useCallback, useMemo } from 'react';

function TestComponent({ name }) {
  const [count, setCount] = useState(0);
  const unusedState = useState('never used');
  
  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>Hello {name}</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}

export default TestComponent;
