const nodemailer = require("nodemailer");

const token = process.env.GITHUB_TOKEN;
const owner = "NEO1842";
const repo = "All-Tasks";

// ─────────────────────────────
// GraphQLでProject + Issue取得
// ─────────────────────────────
const query = `
query {
  repository(owner: "${owner}", name: "${repo}") {
    issues(first: 100, states: OPEN) {
      nodes {
        title
        url
        state
        assignees(first: 5) {
          nodes {
            login
          }
        }
        labels(first: 20) {
          nodes {
            name
          }
        }
        projectItems(first: 10) {
          nodes {
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

// ─────────────────────────────
// データ取得
// ─────────────────────────────
async function fetchData() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  return json.data.repository.issues.nodes;
}

// ─────────────────────────────
// Start Date取得
// ─────────────────────────────
function getStartDate(issue) {
  for (const item of issue.projectItems.nodes) {
    for (const field of item.fieldValues.nodes) {
      if (field.date && field.field?.name?.toLowerCase().includes("start")) {
        return field.date;
      }
    }
  }
  return null;
}

// ─────────────────────────────
// ラベル取得
// ─────────────────────────────
function getLabel(issue, prefix, fallback) {
  const label = issue.labels.nodes.find(l =>
    l.name.toLowerCase().startsWith(prefix.toLowerCase())
  );

  return label
    ? label.name.replace(prefix, "").trim()
    : fallback;
}

// ─────────────────────────────
// メイン処理
// ─────────────────────────────
async function main() {
  const issues = await fetchData();

  const today = new Date().toISOString().split("T")[0];

  // 🎯 Start Dateが今日だけ抽出
  const todayTasks = issues.filter(issue => {
    const start = getStartDate(issue);
    return start === today;
  });

  let body = "";

  body += "📅 Start Date Task Report\n";
  body += "====================================\n\n";

  if (todayTasks.length === 0) {
    body += "📭 今日開始のタスクはありません\n";
  }

  for (const issue of todayTasks) {
    const status = getLabel(issue, "status:", "No Status");
    const priority = getLabel(issue, "priority:", "Normal");

    const assignees = issue.assignees.nodes
      .map(a => a.login)
      .join(", ") || "未設定";

    body += `📌 ${issue.title}\n\n`;
    body += `👤 担当者 : ${assignees}\n`;
    body += `🚦 進行状況 : ${status}\n`;
    body += `🔥 優先順位 : ${priority}\n\n`;
    body += `🔗 ${issue.url}\n\n`;
    body += "━━━━━━━━━━━━━━━━━━━━\n\n";
  }

  // ─────────────────────────────
  // メール送信
  // ─────────────────────────────
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `📅 Start Date Tasks (${today})`,
    text: body
  });

  console.log("Mail sent successfully!");
}

main().catch(console.error);
