var extReady = false;
var listeners = [];
var pendingStateReq = null;
function notify(ev) {
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](ev);
  }
}
window.addEventListener("message", function(e) {
  if (e.source !== window) return;
  var d = e.data;
  if (!d) return;
  if (d.source !== "sorarepilot-ext") return;
  if (d.type === "SORAREPILOT_EXT_READY") {
    extReady = true;
    notify({ type: "ready", version: d.version });
    requestQueueState();
  }
  if (d.type === "QUEUE_STATE_UPDATED") {
    extReady = true;
    notify({ type: "state", state: d.state });
  }
  if (d.type === "SORAREPILOT_EXT_ACK" && d.requestId === pendingStateReq) {
    pendingStateReq = null;
    if (d.response && d.response.state) {
      extReady = true;
      notify({ type: "ready" });
      notify({ type: "state", state: d.response.state });
    }
  }
});
function sendCmd(payload) {
  var reqId = "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  window.postMessage({ source: "sorarepilot-app", type: "SORAREPILOT_EXT_COMMAND", requestId: reqId, payload: payload }, "*");
  return reqId;
}
export function isExtensionReady() {
  return extReady;
}
export function requestQueueState() {
  pendingStateReq = sendCmd({ type: "GET_QUEUE_STATE" });
}
export function subscribeExtension(fn) {
  listeners.push(fn);
  return function() {
    var idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}
export function startMissionsFlow(items) {
  sendCmd({ type: "START_FLOW", flow: "missions", items: items });
}
export function startLineupsFlow(items) {
  sendCmd({ type: "START_FLOW", flow: "lineups", items: items });
}
export function startSalesFlow(items) {
  sendCmd({ type: "START_FLOW", flow: "sales", items: items });
}
export function pauseQueue() {
  sendCmd({ type: "PAUSE_QUEUE" });
}
export function resumeQueue() {
  sendCmd({ type: "RESUME_QUEUE" });
}
export function stopQueue() {
  sendCmd({ type: "STOP_QUEUE" });
}
