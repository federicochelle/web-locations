import { LegalPageLayout } from '@/components/legal/LegalPageLayout.tsx'
import { usePageSeo } from '@/hooks/usePageSeo.ts'

export function PrivacyPage() {
  usePageSeo({
    title: 'Política de Privacidad',
    description:
      'Consultá cómo Film Locations Uruguay recopila, utiliza y protege los datos personales y la información vinculada a la plataforma.',
    canonicalPath: '/privacidad',
  })

  return (
    <LegalPageLayout title="Política de Privacidad">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-brand-300">
          Política de Privacidad de Film Locations UY
        </p>
        <p className="text-brand-100/64">Última actualización: agosto de 2026</p>
      </div>

      <p>
        En Film Locations UY cuidamos la privacidad de nuestros usuarios. Esta Política de Privacidad explica qué información recopilamos, para qué la utilizamos y qué derechos tienen los usuarios sobre sus datos.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">1. Datos que recopilamos</h2>
        <p>
          Podemos recopilar los datos que el usuario proporciona al registrarse o utilizar la plataforma, como nombre, correo electrónico, teléfono e información relacionada con su empresa o productora.
        </p>
        <p>
          También podemos recopilar información generada mediante el uso de la plataforma, como locaciones seleccionadas, favoritos, solicitudes realizadas, proyectos, fechas, mensajes y demás información proporcionada voluntariamente por el usuario.
        </p>
        <p>
          Asimismo, podemos recopilar determinados datos técnicos necesarios para el funcionamiento, seguridad y mejora de la plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">2. Uso de los datos</h2>
        <p>Utilizamos los datos principalmente para:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-brand-300">
          <li>crear y administrar cuentas de usuario;</li>
          <li>permitir la búsqueda, selección y gestión de locaciones;</li>
          <li>gestionar proyectos y solicitudes de locaciones;</li>
          <li>comunicarnos con los usuarios respecto de sus solicitudes;</li>
          <li>
            coordinar con propietarios, responsables, administradores u organismos cuando sea necesario para gestionar una solicitud;
          </li>
          <li>enviar notificaciones y comunicaciones relacionadas con el funcionamiento del servicio;</li>
          <li>mantener la seguridad de la plataforma;</li>
          <li>mejorar nuestros servicios y la experiencia de los usuarios.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">3. Datos relacionados con locaciones</h2>
        <p>
          Film Locations UY puede gestionar información relacionada con locaciones privadas y sus propietarios, responsables o personas de contacto con la finalidad de administrar el catálogo y gestionar solicitudes.
        </p>
        <p>
          Los datos privados de contacto de propietarios o responsables no serán publicados ni puestos a disposición de los usuarios de forma general, salvo que corresponda y exista autorización para ello.
        </p>
        <p>
          En el caso de espacios públicos, la plataforma podrá utilizar información necesaria para identificar, describir y presentar dichos espacios dentro del catálogo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">4. Compartir información</h2>
        <p>
          Podemos compartir únicamente la información necesaria con propietarios, responsables, administradores, organismos u otras partes involucradas cuando resulte necesario para gestionar una solicitud o prestar el servicio.
        </p>
        <p>
          También utilizamos proveedores tecnológicos externos para funciones como alojamiento, almacenamiento, autenticación, comunicaciones, búsqueda, mapas y otros servicios necesarios para operar la plataforma.
        </p>
        <p>
          Estos proveedores podrán procesar determinada información únicamente en la medida necesaria para prestar sus servicios y estarán sujetos a sus propias políticas y obligaciones de privacidad.
        </p>
        <p>Film Locations UY no vende ni comercializa los datos personales de sus usuarios.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">5. Comunicaciones</h2>
        <p>
          Podemos utilizar los datos de contacto proporcionados por el usuario para enviar comunicaciones relacionadas con su cuenta, proyectos, solicitudes, reservas, funcionamiento del servicio u otras gestiones iniciadas mediante la plataforma.
        </p>
        <p>
          Estas comunicaciones podrán realizarse mediante correo electrónico, WhatsApp u otros medios de contacto disponibles.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">6. Seguridad y conservación de los datos</h2>
        <p>
          Film Locations UY adopta medidas razonables destinadas a proteger la información personal y evitar accesos, modificaciones, divulgaciones o usos no autorizados.
        </p>
        <p>
          Los datos podrán conservarse durante el tiempo necesario para prestar el servicio, gestionar solicitudes, mantener registros necesarios y cumplir con las obligaciones que correspondan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">7. Derechos de los usuarios</h2>
        <p>
          Los usuarios podrán solicitar el acceso, actualización, rectificación o eliminación de sus datos personales cuando corresponda.
        </p>
        <p>
          Para realizar una solicitud relacionada con sus datos personales podrán comunicarse con Film Locations UY mediante los datos de contacto indicados al final de esta Política.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">8. Servicios de terceros</h2>
        <p>
          Algunas funcionalidades de Film Locations UY dependen de servicios proporcionados por terceros. Estos servicios pueden tratar determinada información conforme a sus propias políticas de privacidad.
        </p>
        <p>
          Film Locations UY procura utilizar proveedores adecuados para el funcionamiento y seguridad de la plataforma, pero no controla las políticas o prácticas independientes de dichos proveedores.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">9. Cambios en esta Política</h2>
        <p>
          Film Locations UY podrá actualizar esta Política de Privacidad cuando existan cambios en la plataforma, sus servicios o las prácticas relacionadas con el tratamiento de información.
        </p>
        <p>
          La versión vigente será la última publicada en la plataforma. Cuando corresponda, los usuarios podrán ser informados sobre modificaciones relevantes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand-300">10. Contacto</h2>
        <p>
          Para consultas, solicitudes o asuntos relacionados con esta Política de Privacidad o con el tratamiento de datos personales, podés comunicarte con:
        </p>
        <p>
          Film Locations UY
          <br />
          Correo electrónico: locationsfilm51@gmail.com
        </p>
      </section>
    </LegalPageLayout>
  )
}
