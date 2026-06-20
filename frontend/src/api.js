const BASE_URL = 'https://g4lh4l2jej.execute-api.ap-south-1.amazonaws.com/prod';

export async function startIdeaStress(userIdea) {
  const response = await fetch(`${BASE_URL}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_idea: userIdea }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to start Idea Stress test');
  }
  
  return response.json();
}

export async function checkStatus(executionArn, gate) {
  const url = new URL(`${BASE_URL}/status`);
  url.searchParams.append('executionArn', executionArn);
  url.searchParams.append('gate', gate);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to check status for ${gate}`);
  }
  
  return response.json();
}

export async function resumeGate(executionArn, gate, payload) {
  const response = await fetch(`${BASE_URL}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executionArn,
      gate,
      payload
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to resume ${gate}`);
  }
  
  return response.json();
}
