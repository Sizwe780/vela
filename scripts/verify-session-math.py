import sympy as s
x,h,t=s.symbols('x h t', real=True)
checks={
 'cube root tangent':s.diff(x**s.Rational(1,3),x).subs(x,64)==s.Rational(1,48),
 'hyperbolic chain':s.simplify(s.diff(s.sech(5*x+11),x)+5*s.sech(5*x+11)*s.tanh(5*x+11))==0,
 'rational shape':s.simplify(s.diff((x*x+9)/(x-2),x)-(1-13/(x-2)**2))==0 and s.simplify(s.diff((x*x+9)/(x-2),x,2)-26/(x-2)**3)==0,
 'rational extrema':s.simplify(((x*x+9)/(x-2)).subs(x,2+s.sqrt(13))-(4+2*s.sqrt(13)))==0,
 'net travel':s.integrate(abs(2*t-7),(t,0,6))==s.Rational(37,2) and s.integrate(2*t-7,(t,0,6))==-6,
 'removable limit':s.limit((x*x-169)/(x-13),x,13)==26,
 'piecewise continuity':3*4+2==4**2-2==14,
 'end behaviour':s.limit((4*x*x+7)/(2*x*x+9),x,s.oo)==2,
 'secant':s.simplify((2*(4+h)**2+3-35)/h-(16+2*h))==0,
 'product rule':s.expand(s.diff((3*x*x+5)*(x**3-4),x))==15*x**4+15*x*x-24*x,
 'quotient rule':s.simplify(s.diff((x*x+11)/(x-3),x)-(x*x-6*x-11)/(x-3)**2)==0,
 'motion':s.diff(t**3-6*t*t+17*t,t).subs(t,3)==8 and s.diff(t**3-6*t*t+17*t,t,2).subs(t,3)==6,
 'chain':s.simplify(s.diff((2*x**3+7)**4,x)-24*x*x*(2*x**3+7)**3)==0,
 'exp trig':s.simplify(s.diff(s.exp(3*x)*s.sin(2*x),x)-s.exp(3*x)*(3*s.sin(2*x)+2*s.cos(2*x)))==0,
 'log':s.simplify(s.diff(s.log(5*x*x+3),x)-10*x/(5*x*x+3))==0,
 'implicit point':6**2+3*37==147,
 'balloon':4*49*s.Rational(2,5)==s.Rational(392,5),
 'inverse trig':s.diff(s.atan(3*t),t)==3/(1+9*t*t),
 'extrema':[(x**3-12*x+9).subs(x,a) for a in [-3,-2,2,4]]==[18,25,-7,25],
 'inflection':(x**3-9*x*x+8).subs(x,3)==-46,
 'lhopital':s.limit((s.exp(5*x)-1)/s.sin(2*x),x,0)==s.Rational(5,2),
 'optimisation':21*(84-2*21)==882,
 'riemann and integral':s.integrate(3*t+2,(t,0,4))==32,
 'FTC':s.integrate(4*x**3-2,(x,1,3))==76,
 'substitution':s.integrate(6*x*(3*x*x+7)**2,(x,0,2))==2172,
 'exp antiderivative':s.diff(s.exp(4*x+3)/4,x)==s.exp(4*x+3),
 'trig antiderivative':s.diff(s.sin(5*x-2)/5,x)==s.cos(5*x-2),
}
for name,valid in checks.items():
 assert valid,name
 print('PASS',name)
print(len(checks),'independent exact checks passed')
