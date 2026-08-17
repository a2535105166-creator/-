#!/usr/bin/env python3
import json
import os
import re
import ssl
import http.client
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('PORT', '3000'))
ORIGINS = set(x.strip() for x in os.environ.get('ALLOWED_ORIGINS', 'https://a2535105166-creator.github.io').split(',') if x.strip())
PROVIDER = os.environ.get('AI_PROVIDER', 'doubao').lower()
API_KEY = (os.environ.get('AI_API_KEY') or os.environ.get('ARK_API_KEY') or '').strip()
BASE_URL = os.environ.get('AI_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3').strip().rstrip('/')
TEXT_MODEL = os.environ.get('AI_MODEL', 'doubao-seed-2-0-pro-260215').strip()
IMAGE_MODEL = os.environ.get('IMAGE_MODEL', 'doubao-seedream-5-0-260128').strip()
SSL_CONTEXT = ssl.create_default_context()

SHAPE = '只返回JSON对象，不要Markdown。字段：title, subtitle, summary, coverCopy, keywords数组, seoDescription, aigcRisk(0-100), aigcAdvice, sections数组(3-8节，每节含heading/body/emphasis,imagePrompt,imageCaption), closing, cta。imagePrompt必须英文且不要要求图片中文字。aigcRisk只表示语言机械感/模板感启发式评分，不得声称是第三方检测。'

def system_prompt(x):
    return '你是中文内容总监、公众号主编和排版策略师。平台：{}；风格：{}；篇幅：{}；品牌：{}。内容自然、有信息密度、有阅读节奏；不得虚构资质、数字、承诺或事实；标题有传播力但不标题党。{}'.format(
        x.get('platform', '微信公众号'), x.get('style', '高级'), x.get('length', '中等'), x.get('brand') or '未指定', SHAPE)

def _ascii_header(name, value):
    try:
        value.encode('ascii')
    except UnicodeEncodeError:
        raise RuntimeError('{} 含有非ASCII字符，请重新配置。'.format(name))
    return value

def api_post(path, payload, timeout=120):
    if not API_KEY:
        raise RuntimeError('尚未配置 {} API Key'.format(PROVIDER))
    _ascii_header('API Key', API_KEY)

    parsed = urlparse(BASE_URL)
    if parsed.scheme != 'https' or not parsed.hostname:
        raise RuntimeError('AI_BASE_URL 配置无效')

    base_path = parsed.path.rstrip('/')
    request_path = base_path + path
    body = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    headers = {
        'Authorization': _ascii_header('Authorization', 'Bearer ' + API_KEY),
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        'Content-Length': str(len(body)),
        'User-Agent': 'JikeYunAI/2.1'
    }

    conn = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=timeout, context=SSL_CONTEXT)
    try:
        conn.request('POST', request_path, body=body, headers=headers)
        resp = conn.getresponse()
        raw = resp.read()
        text = raw.decode('utf-8', errors='replace')
        try:
            data = json.loads(text) if text else {}
        except Exception:
            data = {'raw': text[:1000]}
        if resp.status < 200 or resp.status >= 300:
            msg = data.get('error', {}).get('message') if isinstance(data, dict) else None
            raise RuntimeError('模型接口错误：{}'.format(msg or 'HTTP {} {}'.format(resp.status, text[:300])))
        return data
    except (OSError, ssl.SSLError, http.client.HTTPException) as e:
        raise RuntimeError('连接模型服务失败：{}'.format(e))
    finally:
        conn.close()

def chat(messages):
    data = api_post('/chat/completions', {'model': TEXT_MODEL, 'messages': messages, 'temperature': 0.7})
    try:
        text = data['choices'][0]['message']['content']
    except Exception:
        raise RuntimeError('模型没有返回内容')
    if not text:
        raise RuntimeError('模型没有返回内容')
    return text

def parse_structured(text):
    text = (text or '').strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.I)
    text = re.sub(r'\s*```$', '', text)
    a, b = text.find('{'), text.rfind('}')
    if a < 0 or b < a:
        raise RuntimeError('模型未返回结构化JSON')
    try:
        return json.loads(text[a:b+1])
    except json.JSONDecodeError as e:
        raise RuntimeError('模型返回JSON解析失败：{}'.format(e))

def generate_image(prompt):
    if PROVIDER != 'doubao':
        raise RuntimeError('当前智能配图默认使用豆包 Seedream')
    data = api_post('/images/generations', {
        'model': IMAGE_MODEL,
        'prompt': prompt,
        'size': '2K',
        'sequential_image_generation': 'disabled',
        'stream': False,
        'response_format': 'url',
        'watermark': False
    }, timeout=180)
    try:
        return data['data'][0]['url']
    except Exception:
        raise RuntimeError('图片模型没有返回结果')

class Handler(BaseHTTPRequestHandler):
    server_version = 'JikeYunAI/2.1'

    def log_message(self, fmt, *args):
        print('%s - %s' % (self.address_string(), fmt % args))

    def cors_headers(self):
        origin = self.headers.get('Origin')
        if origin and ('*' in ORIGINS or origin in ORIGINS):
            return {
                'Access-Control-Allow-Origin': origin,
                'Vary': 'Origin',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        return {}

    def send_json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        for k, v in self.cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self):
        length = int(self.headers.get('Content-Length', '0') or '0')
        if length > 2000000:
            raise RuntimeError('请求过大')
        raw = self.rfile.read(length) if length else b'{}'
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception:
            raise RuntimeError('JSON格式错误')

    def do_HEAD(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in self.cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        if self.path.split('?', 1)[0] in ('/api/status', '/api/health'):
            self.send_json(200, {
                'ok': True,
                'mode': 'live' if API_KEY else 'config_required',
                'provider': PROVIDER,
                'textModel': TEXT_MODEL,
                'imageEnabled': bool(API_KEY and PROVIDER == 'doubao')
            })
        else:
            self.send_json(404, {'error': 'API不存在'})

    def do_POST(self):
        try:
            if not API_KEY:
                return self.send_json(503, {'error': 'AI服务尚未配置 {} API Key。'.format(PROVIDER)})
            path = self.path.split('?', 1)[0]
            x = self.read_json()
            if path == '/api/generate':
                prompt = str(x.get('prompt') or '').strip()
                if len(prompt) < 2:
                    return self.send_json(400, {'error': '请输入至少2个字的创作要求。'})
                out = chat([
                    {'role': 'system', 'content': system_prompt(x)},
                    {'role': 'user', 'content': '完成以下任务：\n' + prompt}
                ])
                return self.send_json(200, {'mode': 'live', 'provider': PROVIDER, 'article': parse_structured(out)})
            if path == '/api/action':
                article = x.get('article')
                if not article:
                    return self.send_json(400, {'error': '缺少文章内容。'})
                actions = {
                    'polish': '整体润色，提高表达质量和可读性，不改变事实。',
                    'rewrite': '整体重新表达，但保持事实和观点不变。',
                    'seo': '优化SEO标题、摘要、关键词和主题词。',
                    'humanize': '降低模板感和机械感，增加自然句式变化，不虚构事实。',
                    'concise': '压缩冗余表达，让文章更短更有力。'
                }
                task = actions.get(x.get('action'), '优化文章。')
                out = chat([
                    {'role': 'system', 'content': '你是资深中文主编。' + SHAPE},
                    {'role': 'user', 'content': task + '\n原文章：' + json.dumps(article, ensure_ascii=False)}
                ])
                return self.send_json(200, {'mode': 'live', 'provider': PROVIDER, 'article': parse_structured(out)})
            if path == '/api/image':
                prompt = x.get('prompt')
                if not prompt:
                    return self.send_json(400, {'error': '缺少图片提示词。'})
                return self.send_json(200, {'image': generate_image(prompt)})
            self.send_json(404, {'error': 'API不存在'})
        except Exception as e:
            self.send_json(500, {'error': str(e) or '服务器错误'})

if __name__ == '__main__':
    print('极刻云真实AI Python后端：{}/{} :{}'.format(PROVIDER, TEXT_MODEL, PORT))
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
