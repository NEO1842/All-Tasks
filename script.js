const token = process.env.GITHUB_TOKEN;

const owner = "NEO1842";
const repo = "All-Tasks";

// Start Dateだけ取るGraphQL
const query = `
query {
  repository(owner: "${owner}", name: "${repo}") {
    issues(first: 50, states: OPEN) {
      nodes {
        title
        url
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

async function main() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();

  const issues = json.data.repository.issues.nodes;

  console.log("📌 Start Date一覧\n");

  for (const issue of issues) {
    for (const item of issue.projectItems.nodes) {
      for (const field of item.fieldValues.nodes) {
        if (field?.field?.name === "Start Date") {
          console.log("──────────────────────");
          console.log("Title :", issue.title);
          console.log("Start :", field.date);
          console.log("URL   :", issue.url);
        }
      }
    }
  }
}

main().catch(console.error);
