const secretPatterns=[
  [/mongodb(?:\+srv)?:\/\/[^\s"']+/gi,'[REDACTED_MONGODB_URI]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,'Bearer [REDACTED]'],
  [/(password|secret|token|otp|authorization)(["'\s:=]+)([^\s,}"']+)/gi,'$1$2[REDACTED]'],
];
function redact(value){let text=value instanceof Error?`${value.name}: ${value.message}\n${value.stack||''}`:typeof value==='string'?value:JSON.stringify(value);for(const [pattern,replacement] of secretPatterns)text=text.replace(pattern,replacement);return text;}
function error(message,value){console.error(message,redact(value));}
function warn(message,value){console.warn(message,redact(value));}
module.exports={redact,error,warn};
