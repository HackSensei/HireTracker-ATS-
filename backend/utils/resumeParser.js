const { GoogleGenerativeAI } = require("@google/generative-ai");

// List of common skills for local parsing fallback
const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "React", "Angular", "Vue", "Next.js", "Express", "NestJS", "Django", "Flask", "Spring", "Laravel",
  "HTML", "CSS", "Tailwind", "Bootstrap", "Sass",
  "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Elasticsearch", "Cassandra", "DynamoDB",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Google Cloud", "Firebase", "Heroku", "Vercel",
  "Git", "GitHub", "CI/CD", "Jenkins", "GitHub Actions", "Agile", "Scrum",
  "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch", "Data Science", "SQL",
  "REST API", "GraphQL", "WebSockets", "Socket.io", "Redux", "GraphQL", "Microservices", "System Design"
];

/**
 * Robust local fallback parser using Regex and heuristics
 * @param {string} text
 * @returns {object} Parsed candidate fields
 */
function parseLocally(text) {
  const result = {
    name: "",
    email: "",
    phone: "",
    skills: [],
    experience: 0,
    education: {
      degree: "",
      institution: "",
      year: null
    }
  };

  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);

  // 1. Email extraction
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // 2. Phone extraction
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }

  // 3. Name heuristic (often one of the first few short lines, avoiding emails/phones/words like "Resume")
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 2 &&
      line.length < 35 &&
      !line.includes("@") &&
      !line.match(/\d/) &&
      !/resume|cv|curriculum|vitae|page/i.test(line)
    ) {
      result.name = line;
      break;
    }
  }
  // Fallback name if none found
  if (!result.name && result.email) {
    result.name = result.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  // 4. Skills extraction
  const foundSkills = new Set();
  const lowerText = text.toLowerCase();
  for (const skill of COMMON_SKILLS) {
    // Escape regex characters
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const skillRegex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (skillRegex.test(lowerText)) {
      foundSkills.add(skill);
    }
  }
  result.skills = Array.from(foundSkills);

  // 5. Experience years extraction
  // Matches "3 years of experience", "5+ yrs experience", "experience: 4 years", etc.
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i) || 
                   text.match(/(?:experience)\s*[:\-]?\s*(\d+)\+?\s*(?:years?|yrs?)/i);
  if (expMatch) {
    result.experience = parseInt(expMatch[1], 10);
  }

  // 6. Education heuristics
  const degreeRegex = /(B\.?S\.?|M\.?S\.?|B\.?Tech|M\.?Tech|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|Bachelor|Master|Doctor|Diploma|Associate)/i;
  const degreeMatch = text.match(degreeRegex);
  if (degreeMatch) {
    result.education.degree = degreeMatch[0];
  }

  // School heuristic: Find lines containing "University", "College", "Institute", "School"
  const instLine = lines.find(line => /(university|college|institute|academy|school)/i.test(line));
  if (instLine) {
    result.education.institution = instLine.replace(/education:?/i, "").trim();
  }

  // Year heuristic: Find 4 digit numbers in the 2000-2030 range or end-year of ranges
  const yearMatches = text.match(/\b(20\d{2})\b/g);
  if (yearMatches) {
    // Grab the highest year (usually graduation year)
    const years = yearMatches.map(Number).filter(y => y >= 2000 && y <= 2030);
    if (years.length > 0) {
      result.education.year = Math.max(...years);
    }
  }

  return result;
}

/**
 * Main parse resume entry point
 * Extracts details using Gemini API if KEY is present, otherwise falls back to local parsing
 * @param {string} text Raw text of the PDF resume
 * @returns {Promise<object>} Parsed candidate fields
 */
async function parseResume(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty resume content");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No GEMINI_API_KEY configured. Falling back to local regex resume parsing.");
    return parseLocally(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `
      You are an expert resume parser. Analyze the following raw text extracted from a resume and extract the key candidate details.
      Return the output as a valid JSON object matching this schema:
      {
        "name": "Candidate's full name",
        "email": "Candidate's email",
        "phone": "Candidate's phone number",
        "skills": ["Array of skills like languages, frameworks, libraries, databases, methodologies"],
        "experience": number (Total years of work experience as an integer. If not specified, estimate based on work history. Default to 0),
        "education": {
          "degree": "Candidate's degree name, e.g. Bachelor of Science in Computer Science",
          "institution": "University or school name",
          "year": number (Graduation year as an integer)
        }
      }

      Strictly extract only what is in the text. Return only the JSON object without any backticks, markdown formatting, or prefix.

      Resume Text:
      ---
      ${text}
      ---
    `;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();
    const parsedData = JSON.parse(responseText);

    // Validate structure
    return {
      name: parsedData.name || "",
      email: parsedData.email || "",
      phone: parsedData.phone || "",
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      experience: typeof parsedData.experience === "number" ? parsedData.experience : 0,
      education: {
        degree: parsedData.education?.degree || "",
        institution: parsedData.education?.institution || "",
        year: typeof parsedData.education?.year === "number" ? parsedData.education.year : null,
      }
    };
  } catch (error) {
    console.error("Gemini Resume Parser failed, falling back to local parsing:", error);
    return parseLocally(text);
  }
}

module.exports = {
  parseResume,
  parseLocally
};
