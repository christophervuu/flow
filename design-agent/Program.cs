using System.CommandLine;
using design_agent.Commands;

var rootCommand = new RootCommand("design-agent - Orchestrates design doc generation via AI agents");

rootCommand.AddCommand(StartCommand.Create());
rootCommand.AddCommand(AnswerCommand.Create());
rootCommand.AddCommand(ShowCommand.Create());

return await rootCommand.InvokeAsync(args);
