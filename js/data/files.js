/*
    files.js
    The fake workspace: file contents, problems and profile data.
    Edit this file to update the content of the page.
*/

export const PROFILE = {
    name: 'M Daniel Lana',
    role: 'Software Developer',
    roles: ['Software Developer', 'PHP · C# · Java', 'JavaScript · Flutter'],
    email: ['info', 'mdlsis.com.ar'],
    website: 'https://www.mdlsis.com.ar/',
    linkedin: 'https://www.linkedin.com/in/mdlana/',
    github: 'https://github.com/mdlsis',
    projects: [
        {
            name: 'Kuntay Platform',
            url: 'https://kuntay.cloud',
            tagline: 'Donde todo se conecta.',
            taglineEn: 'Where everything connects.',
            file: 'projects/Kuntay.md',
        },
        {
            name: 'Vitalinfo',
            url: 'https://vitalinfo.app',
            tagline: 'Tu presión clara para vos y tu médico.',
            taglineEn: 'Your blood pressure, clear for you and your doctor.',
            file: 'projects/Vitalinfo.md',
        },
    ],
    skills: [
        { id: 'php', name: 'PHP', abbr: 'php', detail: 'Vanilla PHP, object-oriented. Backend.', color: '#8892bf' },
        { id: 'csharp', name: 'C#', abbr: 'C#', detail: 'Backend development with C# and .NET.', color: '#9b4f96' },
        { id: 'java', name: 'Java', abbr: 'Jv', detail: 'Backend development with Java.', color: '#e76f00' },
        { id: 'js', name: 'JavaScript', abbr: 'JS', detail: 'Vanilla JS on the frontend. No framework required.', color: '#e5c62c' },
        { id: 'html', name: 'HTML & CSS', abbr: '</>', detail: 'Semantic markup and responsive layouts.', color: '#e34c26' },
        { id: 'flutter', name: 'Flutter', abbr: 'Fl', detail: 'Cross-platform mobile apps with Flutter and Dart.', color: '#42a5f5' },
    ],
};

export const emailAddress = () => PROFILE.email.join('@');

const PROGRAM_CS = `/// <summary>
/// Program.cs - A simple demo to share my contact information
/// </summary>
using MyLife.Objectives.BeHappy;
using MyLife.Rules.Idle;
using System.INeedToReflectOverMyFiaca;
using MDLSis.Core.LazyLife;
using System;

namespace MDL.ContactMe {
    class Program {
        static void Main(string[] args) {
            var user = new User("M Daniel Lana", "Software Developer") {
                Email = "info@mdlsis.com.ar",
                WebSite = "https://www.mdlsis.com.ar/",
                LinkedIn = "https://www.linkedin.com/in/mdlana/",
                GitHub = "https://github.com/mdlsis",
                Projects = new[] { "kuntay.cloud", "vitalinfo.app" }
            };

            user.PrintInfo();
            Console.WriteLine("Press Enter Key to Exit...");
            Console.ReadLine();
        }
    }

    public class User {
        public string Name { get; }
        public string Role { get; }
        public string Email { get; init; }
        public string WebSite { get; init; }
        public string LinkedIn { get; init; }
        public string GitHub { get; init; }
        public string[] Projects { get; init; }

        public User(string name, string role) => (Name, Role) = (name, role);

        public void PrintInfo() {
            Console.WriteLine($"{Name} · {Role}");
            Console.WriteLine($"Email     {Email}");
            Console.WriteLine($"Web       {WebSite}");
            Console.WriteLine($"LinkedIn  {LinkedIn}");
            Console.WriteLine($"GitHub    {GitHub}");
            Console.WriteLine($"Projects  {string.Join(" · ", Projects)}");
        }
    }
}
`;

const SKILLS_JSON = `{
    "name": "M Daniel Lana",
    "role": "Software Developer",
    "stack": {
        "backend": ["PHP (vanilla, OOP)", "C#", "Java"],
        "frontend": ["JavaScript (vanilla)", "HTML5", "CSS3"],
        "mobile": ["Flutter", "Dart"]
    },
    "approach": [
        "Object-oriented design",
        "Clean, maintainable code"
    ],
    "tools": ["Git", "GitHub", "VS Code"]
}
`;

const KUNTAY_MD = `# Kuntay Platform

> **Donde todo se conecta.**
> *Where everything connects.*

## Links

- Website: [kuntay.cloud](https://kuntay.cloud)
- More projects: [Vitalinfo](projects/Vitalinfo.md)
`;

const VITALINFO_MD = `# Vitalinfo

> **Tu presión clara para vos y tu médico.**
> *Your blood pressure, clear for you and your doctor.*

## Links

- Website: [vitalinfo.app](https://vitalinfo.app)
- More projects: [Kuntay Platform](projects/Kuntay.md)
`;

const README_MD = `# me

Hi! I'm **M Daniel Lana**, a software developer.

This page is a small VS Code simulation built with
vanilla HTML, CSS and JavaScript. No frameworks.

## Try it

- Fix the problems with \`Ctrl+.\` (or the bug icon)
- Run the program with \`Ctrl+F5\` (or the play icon)
- Open the command palette with \`Ctrl+Shift+P\`
- Jump to any file with \`Ctrl+P\`
- Type \`help\` in the terminal

## Projects

- [Kuntay Platform](projects/Kuntay.md): kuntay.cloud
- [Vitalinfo](projects/Vitalinfo.md): vitalinfo.app

## Contact

- Email: info@mdlsis.com.ar
- Web: [mdlsis.com.ar](https://www.mdlsis.com.ar/)
- LinkedIn: [in/mdlana](https://www.linkedin.com/in/mdlana/)
- GitHub: [mdlsis](https://github.com/mdlsis)
`;

/**
 * Problems are located by line (1-based) and word.
 * "fix" is the text that replaces the word when the quick fix runs.
 */
export const FILES = [
    {
        path: 'Program.cs',
        lang: 'csharp',
        content: PROGRAM_CS,
        collapsed: ['public class User {'],
        problems: [
            { line: 4, word: 'BeHappy', severity: 'info', code: 'IDE0001', message: 'Always up to date. Keep it.' },
            { line: 5, word: 'Idle', severity: 'warning', code: 'CS0618', message: "'Idle' is obsolete: deprecated and not recommended.", fix: 'Focus' },
            { line: 6, word: 'INeedToReflectOverMyFiaca', severity: 'error', code: 'CS0234', message: "The type or namespace name 'INeedToReflectOverMyFiaca' does not exist in the namespace 'System'.", fix: 'Reflection' },
            { line: 7, word: 'LazyLife', severity: 'warning', code: 'MDL0001', message: "'LazyLife' contains unsafe code. You need to refactor it.", fix: 'CleanCode' },
        ],
    },
    { path: 'skills.json', lang: 'json', content: SKILLS_JSON },
    { path: 'projects/Kuntay.md', lang: 'markdown', content: KUNTAY_MD },
    { path: 'projects/Vitalinfo.md', lang: 'markdown', content: VITALINFO_MD },
    { path: 'README.md', lang: 'markdown', content: README_MD },
];
