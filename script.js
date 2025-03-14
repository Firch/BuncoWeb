function lerp(a, b, t) {
    return a + (b - a) * t;
}

const canvas = document.getElementById("backgroundCanvas");
const gl = canvas.getContext("webgl");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let totalScrolledDistance = 0;
let scrollSpeed = 0;
let lastScrollY = window.scrollY;
let smooth

document.addEventListener("scroll", () => {
    let currentScrollY = window.scrollY;
    scrollSpeed = lerp(scrollSpeed, (currentScrollY - lastScrollY), 0.1);
    lastScrollY = currentScrollY;

    const arrow = document.getElementById("arrow");
    if (window.scrollY > 0) {
        arrow.style.opacity = "0";
    } else {
        arrow.style.opacity = "1";
    }
});


setInterval(() => {
    if (scrollSpeed > 0) {
        totalScrolledDistance += scrollSpeed;
    }
    scrollSpeed *= 0.98;
}, 10);

const vertexShaderSource = `
    #version 100
    attribute vec2 a_position;
    varying vec2 v_texcoord;

    void main() {
        v_texcoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    #version 100
    precision highp float;

    #define MY_HIGHP_OR_MEDIUMP highp
    #define number float

    #define SPIN_EASE 0.5

    varying vec2 v_texcoord;

    uniform vec2 iResolution;
    uniform MY_HIGHP_OR_MEDIUMP number time;
    uniform MY_HIGHP_OR_MEDIUMP number spin_time;

    vec4 effect( vec4 colour, vec2 screen_coords )
    {
        vec2 love_ScreenSize = iResolution.xy;

        MY_HIGHP_OR_MEDIUMP vec4 colour_1 = vec4(0.03, 0.19, 0.36, 1.0); // outside
        MY_HIGHP_OR_MEDIUMP vec4 colour_2 = vec4(1.0, 0.95, 0.68, 1.0); // inside
        MY_HIGHP_OR_MEDIUMP vec4 colour_3 = vec4(0.92, 0.58, 0.07, 1.0); // middle
        MY_HIGHP_OR_MEDIUMP number contrast = 1.0;
        MY_HIGHP_OR_MEDIUMP number spin_amount = 1.0;

        //Convert to UV coords (0-1) and floor for pixel effect
        MY_HIGHP_OR_MEDIUMP number pixel_size = 1.0;
        MY_HIGHP_OR_MEDIUMP vec2 uv = (floor(screen_coords.xy*(1./pixel_size))*pixel_size - 0.5*love_ScreenSize.xy)/length(love_ScreenSize.xy) - vec2(0.12, 0.);
        MY_HIGHP_OR_MEDIUMP number uv_len = length(uv);

        //Adding in a center swirl, changes with time. Only applies meaningfully if the 'spin amount' is a non-zero number
        MY_HIGHP_OR_MEDIUMP number speed = (spin_time*SPIN_EASE*0.2) + 302.2;
        MY_HIGHP_OR_MEDIUMP number new_pixel_angle = (atan(uv.y, uv.x)) + speed - SPIN_EASE*20.*(1.*spin_amount*uv_len + (1. - 1.*spin_amount));
        MY_HIGHP_OR_MEDIUMP vec2 mid = (love_ScreenSize.xy/length(love_ScreenSize.xy))/2.;
        uv = (vec2((uv_len * cos(new_pixel_angle) + mid.x), (uv_len * sin(new_pixel_angle) + mid.y)) - mid);

        //Now add the paint effect to the swirled UV
        uv *= 30.;
        speed = time*(2.);
        MY_HIGHP_OR_MEDIUMP vec2 uv2 = vec2(uv.x+uv.y);

        for(int i=0; i < 5; i++) {
            uv2 += sin(max(uv.x, uv.y)) + uv;
            uv  += 0.5*vec2(cos(5.1123314 + 0.353*uv2.y + speed*0.131121),sin(uv2.x - 0.113*speed));
            uv  -= 1.0*cos(uv.x + uv.y) - 1.0*sin(uv.x*0.711 - uv.y);
        }

        //Make the paint amount range from 0 - 2
        MY_HIGHP_OR_MEDIUMP number contrast_mod = (0.25*contrast + 0.5*spin_amount + 1.2);
        MY_HIGHP_OR_MEDIUMP number paint_res =min(2., max(0.,length(uv)*(0.035)*contrast_mod));
        MY_HIGHP_OR_MEDIUMP number c1p = max(0.,1. - contrast_mod*abs(1.-paint_res));
        MY_HIGHP_OR_MEDIUMP number c2p = max(0.,1. - contrast_mod*abs(paint_res));
        MY_HIGHP_OR_MEDIUMP number c3p = 1. - min(1., c1p + c2p);

        MY_HIGHP_OR_MEDIUMP vec4 ret_col = (0.3/contrast)*colour_1 + (1. - 0.3/contrast)*(colour_1*c1p + colour_2*c2p + vec4(c3p*colour_3.rgb, c3p*colour_1.a));

        return ret_col;
    }

    void main() {
        vec2 uv = v_texcoord;
        uv.y = 1.0 - uv.y;
        uv.x += 2.0/15.0;
        vec2 fragCoord = uv * iResolution;
        gl_FragColor = effect(vec4(1.0, 1.0, 0.0, 1.0), fragCoord);
    }
`;

function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);

const vertices = new Float32Array([
    -1.0,  1.0,
    -1.0, -1.0,
     1.0,  1.0,
     1.0, -1.0,
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "a_position");
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(positionAttributeLocation);

const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "iResolution");
const timeUniformLocation = gl.getUniformLocation(shaderProgram, "time");
const spinTimeUniformLocation = gl.getUniformLocation(shaderProgram, "spin_time");

function animate() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const time = performance.now() / 1000;

    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1f(timeUniformLocation, time);
    gl.uniform1f(spinTimeUniformLocation, time + (totalScrolledDistance * 0.0025));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(animate);
}

animate();

async function fetchLatestVersion() {
    const url = `https://api.github.com/repos/Firch/Bunco/releases/latest`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    const releaseDate = new Date(data.published_at);
    const formattedDate = releaseDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    document.getElementById("download-version").innerText = `Latest version: ${data.tag_name} (${formattedDate})`;
}

window.onload = fetchLatestVersion;

document.getElementById('arrow').addEventListener('click', function() {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
});

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("img.screenshot").forEach(img => {
        img.addEventListener("click", function () {
            window.location.href = img.src;
        });
    });
});
