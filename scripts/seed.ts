async function main() {
  console.log("No seed data configured.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
