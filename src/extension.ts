"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const cp = require('child_process');
// https://github.com/astrand/xclip
// https://www.macobserver.com/tips/quick-tip/use-clipboard-in-terminal-without-mouse/
// https://developer.gnome.org/gtk3/stable/gtk3-Clipboards.html
// https://developer.gnome.org/gtk3/stable/gtk-compiling.html
// sudo apt-get install libgtk-3-dev
function CleanWordFormatting(input) {
    // 1. Remove line breaks / Mso classes
    var stringStripper = /(\n|\r| class=(")?Mso[a-zA-Z]+(")?)/g;
    var output = input.replace(stringStripper, ' ');

    // 2. Strip Word generated HTML comments
    var commentSripper = new RegExp('<!--(.*?)-->', 'g');
    var output = output.replace(commentSripper, '');
    var tagStripper = new RegExp('<(/)*(meta|link|\\?xml:|st1:|o:|font)(.*?)>', 'gi');
    output = output.replace(tagStripper, '');
	
	tagStripper = new RegExp('<p(.*?)>', 'gi');
	output = output.replace(tagStripper, '\r<p>');
	tagStripper = new RegExp('<span(.*?)>', 'gi');
	output = output.replace(tagStripper, '\r<span>');
	tagStripper = new RegExp('<div(.*?)>', 'gi');
	output = output.replace(tagStripper, '\r<div>');
	tagStripper = new RegExp('<strong(.*?)>', 'gi');
	output = output.replace(tagStripper, '<strong>');
	tagStripper = new RegExp('<ul(.*?)>', 'gi');
	output = output.replace(tagStripper, '\r<ul>');
	tagStripper = new RegExp('<ol(.*?)>', 'gi');
	output = output.replace(tagStripper, '\r<ol>');
	tagStripper = new RegExp('<li(.*?)>', 'gi');
	output = output.replace(tagStripper, '\r<li>');

	output = output.replace(/&quot;/gi, '"');

/*     // 4. Remove everything in between and including tags '<style(.)style(.)>'
    var badTags = ['style', 'script', 'applet', 'embed', 'noframes', 'noscript'];
    for (var i = 0; i < badTags.length; i++) {
        tagStripper = new RegExp('<' + badTags[i] + '(.*?)</' + badTags[i] + '>', 'gi');
        output = output.replace(tagStripper, '');
    }

    // 6. Remove any unwanted attributes
    var badAttributes = ['start'];
    for (var i = 0; i < badAttributes.length; i++) {
        var attributeStripper = new RegExp(' ' + badAttributes[i] + '="(.*?)"', 'gi');
        output = output.replace(attributeStripper, '');
    } */

    return output;
}

function getClipboardData(callback) {
    const ext = vscode.extensions.getExtension('d3v.pastespecial');
    if (!ext) {
        return "";
    }
    //console.log("extension path is '" + ext.extensionPath + "'");
    //console.log("platform is " + process.platform + "(" + process.arch + ")");
    // 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', and 'win32'
    // 'arm', 'arm64', 'ia32', 'mips','mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', and 'x64'
    let cmd = "";
    if (process.platform === "win32") {
        cmd = ext.extensionPath + "\\bin\\win32\\winclip.exe";
    }
    else if (process.platform === "linux") {
        cmd = ext.extensionPath + "/bin/linux/gtkclip";
    }
    else {
        vscode.env.clipboard.readText().then((text) => {
            callback(text);
        });
        return;
    }
    cp.exec(cmd, (err, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (err) {
            console.log("error '" + err + "' when executing command '" + cmd + "'");
        }
        else {
            const obj = JSON.parse(stdout);
            if (Array.isArray(obj)) {
                let pickName = new Array();
                let pickFormat = new Array();
                for (let index = 0; index < obj.length; index++) {
                    pickName.push(obj[index].name);
                    pickFormat.push(obj[index].format);
                }
                //const value = yield vscode.window.showQuickPick(pickName, { placeHolder: 'Select Format' });
                //if (value !== undefined) {
                    //const index = pickName.indexOf(value);
                    const format = pickFormat[obj.length-1];
                    cp.exec(cmd + " " + format, (err, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            console.error(err);
                        }
                        else {
                            const obj = JSON.parse(stdout);
                            callback(obj.data);
                        }
                    }));
                //}
            }
        }
    }));
}
function pasteSpecial() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        getClipboardData((text) => {
            editor.edit(editBuilder => {
				text=CleanWordFormatting(text);
                if (editor.selection.isEmpty) {
                    editBuilder.insert(editor.selection.active, text);
                }
                else {
                    editor.selections.forEach(sel => {
                        const range = sel.isEmpty ? document.getWordRangeAtPosition(sel.start) || sel : sel;
                        editBuilder.replace(range, text);
                    });
                }
            });
        });
    }
}
function install() {
    if (process.platform !== "linux") {
        return;
    }
    const ext = vscode.extensions.getExtension('d3v.pastespecial');
    if (ext) {
        const cmd = "chmod 0766 " + ext.extensionPath + "/bin/linux/gtkclip";
        cp.exec(cmd, (err, stdout, stderr) => __awaiter(this, void 0, void 0, function* () {
            if (err) {
                console.log("error '" + err + "' when executing command '" + cmd + "'");
            }
        }));
    }
}
function activate(context) {
    install();
    let disposable = vscode.commands.registerCommand('extension.pastespecial', () => {
        pasteSpecial();
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
