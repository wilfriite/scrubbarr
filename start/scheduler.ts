import scheduler from "adonisjs-scheduler/services/main";

scheduler.command("inspire").everyFiveSeconds().withoutOverlapping();

scheduler
  .call(() => {
    console.log("Pruge DB!");
  })
  .weekly();
